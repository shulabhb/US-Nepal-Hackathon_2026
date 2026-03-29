/**
 * Rule-based strain projection from saved plan task metadata (user-entered tasks).
 * Non-clinical — rough illustration only, not a forecast.
 */

import type {
  CheckinDetailResponse,
  PlanChecklistItem,
  SavedPlanGenerationMeta,
  StoredPlan,
  UserPlanTaskInput,
} from "@/types/api";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function roundScore(n: number): number {
  return Math.round(clamp(n, 0, 100));
}

function personalTasksFromPlan(row: StoredPlan): {
  meta: SavedPlanGenerationMeta;
  tasks: UserPlanTaskInput[];
} | null {
  const raw = row.plan_meta;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.user_tasks)) return null;
  const tasks = o.user_tasks as UserPlanTaskInput[];
  if (tasks.length === 0) return null;
  return { meta: raw as SavedPlanGenerationMeta, tasks };
}

/** When `plan_meta.user_tasks` was never saved (preset flows, older rows, DB without column). */
function tasksFromChecklistFallback(
  items: PlanChecklistItem[],
): UserPlanTaskInput[] {
  const out: UserPlanTaskInput[] = [];
  for (const it of items) {
    const name = (it.label ?? "").trim();
    if (!name) continue;
    const et = (it.time_estimate ?? "").trim();
    out.push({
      name,
      priority: "medium",
      estimated_time: et.length > 0 ? et : null,
    });
  }
  return out;
}

function scheduleKindFromPlanRow(p: StoredPlan): "daily" | "weekly" {
  const h = p.time_horizon.toLowerCase();
  if (
    /\bweek\b/.test(h) ||
    /7\s*-?\s*day/.test(h) ||
    /\bseven\s+day/.test(h)
  ) {
    return "weekly";
  }
  return "daily";
}

function latestPersonalTasksBlock(
  plans: StoredPlan[],
): { meta: SavedPlanGenerationMeta; tasks: UserPlanTaskInput[] } | null {
  for (const p of plans) {
    const hit = personalTasksFromPlan(p);
    if (hit) return hit;
  }
  for (const p of plans) {
    const tasks = tasksFromChecklistFallback(p.checklist_items);
    if (tasks.length === 0) continue;
    const schedule_kind = scheduleKindFromPlanRow(p);
    const meta: SavedPlanGenerationMeta = {
      version: 1,
      plan_type: p.plan_type,
      schedule_kind,
      plan_name: p.title || null,
      generate_full_schedule: false,
      user_tasks: tasks,
    };
    return { meta, tasks };
  }
  return null;
}

/** Parse strings like "45 min", "2h", "1.5 hours" into minutes. */
export function parseEstimatedMinutesToNumber(
  s: string | null | undefined,
): number {
  if (!s || typeof s !== "string") return 45;
  const t = s.toLowerCase().trim();
  if (!t) return 45;

  let hours = 0;
  let mins = 0;
  const hMatch = t.match(/(\d+(?:\.\d+)?)\s*h(?:r|ours?)?/);
  if (hMatch) hours += Number.parseFloat(hMatch[1]);
  const mMatch = t.match(/(\d+)\s*m(?:in|ins)?/);
  if (mMatch) mins += Number.parseInt(mMatch[1], 10);

  if (hours === 0 && mins === 0) {
    const n = Number.parseFloat(t.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) {
      if (n <= 12 && t.includes("h")) return Math.round(n * 60);
      if (n <= 24 && /^\d+$/.test(t.trim())) return Math.round(n * 60);
      return Math.round(n);
    }
  }

  const total = Math.round(hours * 60 + mins);
  return total > 0 ? clamp(total, 10, 14 * 60) : 45;
}

function priorityWeight(p: UserPlanTaskInput["priority"]): number {
  if (p === "high") return 1.25;
  if (p === "low") return 0.8;
  return 1;
}

function dailyCapacityMinutes(energy1to10: number): number {
  const e = clamp(energy1to10, 1, 10);
  return Math.round(200 + (e - 1) * 32);
}

export type BurnoutTaskProjection = {
  hasSignal: boolean;
  /** Same as live dashboard composite when hasSignal; still set for consistency. */
  current: number;
  /** If the listed workload keeps running without pacing or boundaries. */
  ifNeglected: number;
  /** If they follow the tailored plan (pacing + recovery in the mix). */
  withTailoredPlan: number;
  /** Short line for UI — workload vs capacity. */
  loadLine: string | null;
};

/**
 * Uses the newest saved plan with `plan_meta.user_tasks`, or otherwise derives tasks from
 * `checklist_items` so preset plans and legacy saves still unlock scenario rings.
 */
export function computeBurnoutTaskProjection(args: {
  checkin: CheckinDetailResponse;
  plans: StoredPlan[];
  composite: number;
}): BurnoutTaskProjection {
  const block = latestPersonalTasksBlock(args.plans);
  const current = roundScore(args.composite);

  if (!block) {
    return {
      hasSignal: false,
      current,
      ifNeglected: current,
      withTailoredPlan: current,
      loadLine: null,
    };
  }

  const { tasks, meta } = block;
  const energy = clamp(args.checkin.energy_level ?? 5, 1, 10);
  const stress = clamp(args.checkin.stress_level ?? 5, 1, 10);
  const scheduleWeekly = meta.schedule_kind === "weekly";

  let weightedMinutes = 0;
  let highCount = 0;
  for (const task of tasks) {
    const m = parseEstimatedMinutesToNumber(task.estimated_time);
    weightedMinutes += m * priorityWeight(task.priority);
    if (task.priority === "high") highCount += 1;
  }

  const capDay = dailyCapacityMinutes(energy);
  const capWindow = scheduleWeekly ? capDay * 6 : capDay;
  const ratio = weightedMinutes / Math.max(1, capWindow);

  let loadStrain = 0;
  if (ratio < 0.72) loadStrain = 4;
  else if (ratio < 0.92) loadStrain = 10;
  else if (ratio < 1.12) loadStrain = 18;
  else if (ratio < 1.38) loadStrain = 26;
  else loadStrain = clamp(34 + (ratio - 1.38) * 28, 34, 48);

  loadStrain = roundScore(loadStrain + highCount * 2);
  const stressAmp = 1 + (stress - 5) * 0.06;
  const neglectBump = roundScore(loadStrain * stressAmp);

  const fullScheduleBonus = meta.generate_full_schedule ? 5 : 0;
  const planRelief = roundScore(
    clamp(10 + loadStrain * 0.38 + fullScheduleBonus, 8, 30),
  );

  const ifNeglected = roundScore(clamp(current + neglectBump, 0, 100));
  let withTailoredPlan = roundScore(clamp(current - planRelief, 0, 100));
  if (withTailoredPlan >= current) {
    withTailoredPlan = Math.max(0, current - 6);
  }
  if (withTailoredPlan >= ifNeglected) {
    withTailoredPlan = clamp(ifNeglected - 8, 0, 100);
  }

  const scope = scheduleWeekly ? "this week" : "today";
  const loadLine =
    ratio >= 1.05
      ? `Your listed tasks add up to a heavy ${scope} versus your current energy window—without pacing, strain can climb.`
      : `Your task list for ${scope} is close to a doable load if you protect pacing and recovery.`;

  return {
    hasSignal: true,
    current,
    ifNeglected,
    withTailoredPlan,
    loadLine,
  };
}

/**
 * Same load math as saved-plan projection, but for a draft (e.g. chat-built plan before save).
 * `baselineComposite` should match the live rule-based overview strain (0–100).
 */
export function projectStrainForProposedTasks(args: {
  checkin: CheckinDetailResponse;
  baselineComposite: number;
  tasks: UserPlanTaskInput[];
  schedule_kind: "daily" | "weekly";
  generate_full_schedule: boolean;
}): BurnoutTaskProjection {
  const current = roundScore(args.baselineComposite);
  if (args.tasks.length === 0) {
    return {
      hasSignal: false,
      current,
      ifNeglected: current,
      withTailoredPlan: current,
      loadLine: null,
    };
  }

  const meta: SavedPlanGenerationMeta = {
    version: 1,
    plan_type: "personal_tasks",
    schedule_kind: args.schedule_kind,
    plan_name: null,
    generate_full_schedule: args.generate_full_schedule,
    user_tasks: args.tasks,
  };

  const energy = clamp(args.checkin.energy_level ?? 5, 1, 10);
  const stress = clamp(args.checkin.stress_level ?? 5, 1, 10);
  const scheduleWeekly = meta.schedule_kind === "weekly";

  let weightedMinutes = 0;
  let highCount = 0;
  for (const task of args.tasks) {
    const m = parseEstimatedMinutesToNumber(task.estimated_time);
    weightedMinutes += m * priorityWeight(task.priority);
    if (task.priority === "high") highCount += 1;
  }

  const capDay = dailyCapacityMinutes(energy);
  const capWindow = scheduleWeekly ? capDay * 6 : capDay;
  const ratio = weightedMinutes / Math.max(1, capWindow);

  let loadStrain = 0;
  if (ratio < 0.72) loadStrain = 4;
  else if (ratio < 0.92) loadStrain = 10;
  else if (ratio < 1.12) loadStrain = 18;
  else if (ratio < 1.38) loadStrain = 26;
  else loadStrain = clamp(34 + (ratio - 1.38) * 28, 34, 48);

  loadStrain = roundScore(loadStrain + highCount * 2);
  const stressAmp = 1 + (stress - 5) * 0.06;
  const neglectBump = roundScore(loadStrain * stressAmp);

  const fullScheduleBonus = meta.generate_full_schedule ? 5 : 0;
  const planRelief = roundScore(
    clamp(10 + loadStrain * 0.38 + fullScheduleBonus, 8, 30),
  );

  const ifNeglected = roundScore(clamp(current + neglectBump, 0, 100));
  let withTailoredPlan = roundScore(clamp(current - planRelief, 0, 100));
  if (withTailoredPlan >= current) {
    withTailoredPlan = Math.max(0, current - 6);
  }
  if (withTailoredPlan >= ifNeglected) {
    withTailoredPlan = clamp(ifNeglected - 8, 0, 100);
  }

  const scope = scheduleWeekly ? "this week" : "today";
  const loadLine =
    ratio >= 1.05
      ? `Your listed tasks add up to a heavy ${scope} versus your current energy window—without pacing, strain can climb.`
      : `Your task list for ${scope} is close to a doable load if you protect pacing and recovery.`;

  return {
    hasSignal: true,
    current,
    ifNeglected,
    withTailoredPlan,
    loadLine,
  };
}

/**
 * Rough illustrative strain if recovery/wellness checklist items are dropped (non-clinical).
 */
export function projectStrainIfStrippingRecovery(args: {
  checkin: CheckinDetailResponse;
  baselineComposite: number;
  checklistItems: PlanChecklistItem[];
}): { baseline: number; stripped: number; line: string } {
  const baseline = roundScore(args.baselineComposite);
  const labels = args.checklistItems.map((i) =>
    `${i.label ?? ""} ${i.description ?? ""}`.toLowerCase(),
  );
  const recoveryHints =
    /\b(rest|recovery|wellness|walk|stretch|meditat|sleep|breathe|break|hydrat|calm|unwind|social|connect)\b/;
  const recoveryish = labels.filter((t) => recoveryHints.test(t)).length;
  const fraction =
    args.checklistItems.length > 0
      ? recoveryish / args.checklistItems.length
      : 0;
  const bump = roundScore(clamp(6 + fraction * 28 + baseline * 0.08, 6, 42));
  const stripped = roundScore(clamp(baseline + bump, 0, 100));
  const line =
    recoveryish > 0
      ? `Removing softer recovery-style steps (${recoveryish} in this draft) often raises the same rule-based readout because those steps buffer load.`
      : "This draft already leans work-heavy—trimming further usually asks more of your stress window.";
  return { baseline, stripped, line };
}
