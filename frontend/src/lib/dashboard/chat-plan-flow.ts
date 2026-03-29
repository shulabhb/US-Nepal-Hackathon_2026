/**
 * Guided plan creation inside Support Chat (same fields as Plan tab “Create plan”).
 * No UI chrome — only message text + client state.
 */

import type {
  GeneratePlanResponse,
  SavedPlanGenerationMeta,
  UserPlanTaskInput,
} from "@/types/api";
import type { PlanContextField } from "@/lib/dashboard/plan-context-fields";
import {
  fieldsForPlanType,
  PLAN_TYPE_OPTIONS,
  type PlanTypeId,
} from "@/lib/dashboard/plan-context-fields";

/** Everything needed to call POST /ai/plan/generate and optional save metadata. */
export type PendingChatGenerate = {
  planType: PlanTypeId;
  planName: string | null;
  scheduleKind: "daily" | "weekly" | null;
  userTasks: UserPlanTaskInput[] | null;
  generateFullSchedule: boolean;
  rawAnswers: Record<string, string>;
  userRequest: string;
};

export type ChatPlanSession =
  | { kind: "pick_type" }
  | { kind: "personal_name" }
  | { kind: "personal_schedule"; planName: string }
  | {
      kind: "personal_tasks";
      planName: string;
      scheduleKind: "daily" | "weekly";
    }
  | {
      kind: "personal_full";
      planName: string;
      scheduleKind: "daily" | "weekly";
      tasks: UserPlanTaskInput[];
    }
  | {
      kind: "preset_field";
      planType: PlanTypeId;
      index: number;
      answers: Record<string, string>;
    }
  | { kind: "await_notes"; base: PendingChatGenerate }
  | {
      kind: "review";
      draft: GeneratePlanResponse;
      meta: SavedPlanGenerationMeta | null;
      base: PendingChatGenerate;
    }
  | {
      kind: "risk_strip";
      draft: GeneratePlanResponse;
      meta: SavedPlanGenerationMeta | null;
      base: PendingChatGenerate;
      baselineComposite: number;
      strippedProjected: number;
      explainer: string;
    };

export function buildSavedMetaForChatGenerate(
  base: PendingChatGenerate,
): SavedPlanGenerationMeta | null {
  if (
    base.planType !== "personal_tasks" ||
    !base.userTasks ||
    base.userTasks.length === 0 ||
    !base.scheduleKind
  ) {
    return null;
  }
  return {
    version: 1,
    plan_type: base.planType,
    schedule_kind: base.scheduleKind,
    plan_name: base.planName?.trim() || null,
    generate_full_schedule: base.generateFullSchedule,
    user_tasks: base.userTasks.map((t) => ({
      name: t.name.trim(),
      priority: t.priority,
      estimated_time: t.estimated_time?.trim()
        ? t.estimated_time.trim()
        : null,
    })),
  };
}

export const PLAN_FLOW_CHIP_LABELS = [
  "Help me make a quick plan",
  "Help me make a plan",
] as const;

const PLAN_INTENT_RE =
  /\b(quick\s+plan|make\s+(a\s+)?plan|create\s+(a\s+)?plan|build\s+(a\s+)?plan|new\s+plan|plan\s+for\s+me|help\s+me\s+plan)\b/i;

export function messageStartsPlanFlow(text: string): boolean {
  const t = text.trim();
  if (PLAN_FLOW_CHIP_LABELS.some((l) => l.toLowerCase() === t.toLowerCase())) {
    return true;
  }
  return PLAN_INTENT_RE.test(t);
}

export function wantsCancelFlow(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "cancel" ||
    t === "stop" ||
    t.startsWith("cancel ") ||
    t === "exit"
  );
}

export function wantsSavePlanReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "save" ||
    t === "save it" ||
    t === "save plan" ||
    t === "looks good" ||
    t === "yes save" ||
    t === "ok save" ||
    t === "that works"
  );
}

export function wantsConfirmRisk(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "confirm" ||
    t === "confirm strip" ||
    t === "yes i'm sure" ||
    t === "yes im sure" ||
    t === "yes sure" ||
    t === "go ahead" ||
    t === "do it"
  );
}

export function wantsKeepPlanInstead(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "keep" || t === "keep it" || t === "never mind" || t === "no";
}

/** User wants fewer wellness items or less load. */
export function wantsStripRecoveryOrLightenLoad(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (wantsSavePlanReply(t) || wantsCancelFlow(t)) return false;
  if (
    /\b(too much|overwhelmed|overloaded|lighten|trim (the )?plan|make it shorter|fewer steps)\b/.test(
      t,
    )
  ) {
    return true;
  }
  return (
    /\b(remove|drop|delete|strip|less|fewer|no more|skip|cut)\b/.test(t) &&
    /\b(wellness|recover|rest|pacing|extra|overload|lighter|simpler|shorter|stacked|overfull|over.?commit)\b/.test(
      t,
    )
  );
}

export function formatPlanTypeMenu(): string {
  const lines = PLAN_TYPE_OPTIONS.map(
    (o, i) => `${i + 1}. ${o.label} — ${o.id}`,
  );
  return [
    "Same choices as the Plan tab. Reply with a number (1–8) or a type id (e.g. study_plan or sleep_reset).",
    "",
    ...lines,
    "",
    "Say **cancel** to stop.",
  ].join("\n");
}

export function parsePlanTypeId(raw: string): PlanTypeId | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const n = parseInt(t, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= PLAN_TYPE_OPTIONS.length) {
    return PLAN_TYPE_OPTIONS[n - 1].id;
  }
  const hit = PLAN_TYPE_OPTIONS.find((o) => o.id === t);
  if (hit) return hit.id;
  if (t.length < 3) return null;
  const exact = PLAN_TYPE_OPTIONS.find((o) => o.label.toLowerCase() === t);
  if (exact) return exact.id;
  const starts = PLAN_TYPE_OPTIONS.find(
    (o) => t.length >= 4 && o.label.toLowerCase().startsWith(t),
  );
  if (starts) return starts.id;
  const contains = PLAN_TYPE_OPTIONS.find(
    (o) => t.length >= 5 && o.label.toLowerCase().includes(t),
  );
  return contains?.id ?? null;
}

export function parseScheduleKind(raw: string): "daily" | "weekly" | null {
  const t = raw.trim().toLowerCase();
  if (/\bweekly\b|^w\b|week\b/.test(t)) return "weekly";
  if (/\bdaily\b|^d\b|day\b|today\b/.test(t)) return "daily";
  return null;
}

export function parseYesNo(raw: string): boolean | null {
  const t = raw.trim().toLowerCase();
  if (/\b(yes|yeah|yep|sure|ok|okay|please|full)\b/.test(t)) return true;
  if (/\b(no|nope|nah|skip|not)\b/.test(t)) return false;
  return null;
}

/** One task per line: "Name | high|medium|low | 45 min" — middle and tail optional. */
export function parsePersonalTaskLines(raw: string): {
  ok: boolean;
  tasks: UserPlanTaskInput[];
  error?: string;
} {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { ok: false, tasks: [], error: "Add at least one task line." };
  }
  const tasks: UserPlanTaskInput[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    const name = (parts[0] ?? "").trim();
    if (!name) continue;
    let priority: UserPlanTaskInput["priority"] = "medium";
    let estimated_time: string | null = null;
    if (parts[1]) {
      const p = parts[1].toLowerCase();
      if (p === "high" || p === "low" || p === "medium") {
        priority = p;
      }
    }
    if (parts[2]) {
      estimated_time = parts[2] || null;
    } else if (parts[1] && !["high", "low", "medium"].includes(parts[1].toLowerCase())) {
      estimated_time = parts[1];
    }
    tasks.push({
      name: name.slice(0, 500),
      priority,
      estimated_time,
    });
  }
  if (tasks.length === 0) {
    return {
      ok: false,
      tasks: [],
      error: "Couldn’t read task names—try one task per line, e.g. `Email team | high | 30 min`.",
    };
  }
  return { ok: true, tasks };
}

export function formatPresetFieldQuestion(
  planType: PlanTypeId,
  field: PlanContextField,
): string {
  if (field.kind === "select" && field.options?.length) {
    const opts = field.options
      .map((o, i) => `${i + 1}. ${o.label}`)
      .join("\n");
    return `${field.label}\n${opts}\n(Number or option name.)`;
  }
  return `${field.label}\n(Send one message; multiple lines are fine.)`;
}

/** Collapse whitespace for stored context (keeps full answer, easier to read in prompts). */
export function normalizePresetAnswer(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 2000);
}

export function parseSelectChoice(
  raw: string,
  field: PlanContextField,
): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (field.kind === "select" && field.options) {
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= field.options.length) {
      return field.options[n - 1].value;
    }
    const low = t.toLowerCase();
    const hit = field.options.find(
      (o) =>
        o.value.toLowerCase() === low ||
        o.label.toLowerCase() === low ||
        o.label.toLowerCase().includes(low),
    );
    if (hit) return hit.value;
  }
  return t;
}

export function summarizeGeneratedPlan(res: GeneratePlanResponse): string {
  const { plan } = res;
  const lines = plan.checklist_items.slice(0, 12).map((it, i) => {
    const label = (it.label ?? "Step").trim();
    const te = (it.time_estimate ?? "").trim();
    return `${i + 1}. ${label}${te ? ` · ${te}` : ""}`;
  });
  const more =
    plan.checklist_items.length > 12
      ? `\n… +${plan.checklist_items.length - 12} more steps`
      : "";
  return [
    plan.title,
    "",
    plan.summary,
    "",
    `Horizon: ${plan.time_horizon}`,
    "",
    "Steps:",
    ...lines,
    more,
    "",
    "Reply **save** to keep this version.",
    "To tweak one step without redoing the whole plan: add: …  |  remove 3  |  remove: a few words from the title",
    "To trim wellness/recovery/pacing, say so—we’ll show strain context first.",
    "To regenerate from your saved answers, say **regenerate**.",
  ].join("\n");
}

export function optionalNotesPrompt(): string {
  return (
    "Anything else for the generator? Reply with a short note, or **skip**."
  );
}
