/**
 * Derived copy + structure for the dashboard “support surface” (status, friction,
 * plan narrative, next step). Rule-based, trauma-informed tone — not clinical.
 */

import {
  labelSymptom,
  parseIntakeFromCheckin,
} from "@/lib/dashboard/checkin-view-model";
import {
  nextUnfinishedChecklistTask,
  planChecklistProgress,
} from "@/lib/dashboard/plan-checklist";
import {
  labelForStoredGoal,
  labelForStoredPressure,
} from "@/lib/dashboard/stored-labels";
import type {
  BurnoutRiskBand,
  BurnoutViewModel,
  OverviewNextMoveKind,
} from "@/lib/burnout/burnout-view-model";
import {
  overviewActionLabel,
  overviewBestServices,
  overviewTopDriverLine,
  pickOverviewNextMove,
} from "@/lib/burnout/burnout-view-model";
import type {
  CheckinDetailResponse,
  PlanChecklistItem,
  StoredPlan,
} from "@/types/api";

const SLEEP_WORDS =
  /sleep|rest|bed|night|wind|insomnia|nap|tired|fatigue|wake|dream|wind-down|wind down/i;

export type CurrentStateSummary = {
  band: BurnoutRiskBand;
  bandLabel: string;
  /** Main thematic line — risk snapshot title or strongest driver. */
  primaryFocus: string;
  /** Single grounded interpretation line. */
  plainInsight: string;
};

export type FrictionBlock = {
  title: string;
  bullets: string[];
};

/** Up to three most recent saved plans for overview follow-through. */
export type PlanFollowThroughRow = {
  id: string;
  title: string;
  completed: number;
  total: number;
  percent: number;
};

export type NextBestStepModel = {
  headline: string;
  body: string;
  kind: OverviewNextMoveKind;
  actionLabel: string;
  backup: { label: string; kind: OverviewNextMoveKind } | null;
};

export type OverviewSupportSurface = {
  state: CurrentStateSummary;
  friction: FrictionBlock;
  planFollowThroughRows: PlanFollowThroughRow[];
  /** Total saved plans (rows are capped at 3). */
  savedPlanCount: number;
  nextStep: NextBestStepModel;
};

function joinReadable(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function sleepTaskCounts(items: PlanChecklistItem[]): {
  sleepOpen: number;
  sleepDone: number;
} {
  let sleepOpen = 0;
  let sleepDone = 0;
  for (const it of items) {
    const legacy = it as PlanChecklistItem & { rationale?: string | null };
    const text = `${it.label} ${it.description ?? ""} ${legacy.rationale ?? ""}`;
    if (!SLEEP_WORDS.test(text)) continue;
    if (it.completed === true) sleepDone++;
    else sleepOpen++;
  }
  return { sleepOpen, sleepDone };
}

function stallPattern(items: PlanChecklistItem[]): boolean {
  if (items.length < 5) return false;
  const completed = items.filter((i) => i.completed === true).length;
  if (completed < 2 || completed >= items.length - 1) return false;
  const firstIncomplete = items.findIndex((i) => i.completed !== true);
  if (firstIncomplete < 0) return false;
  const doneBeforeGap = items
    .slice(0, firstIncomplete)
    .every((i) => i.completed === true);
  const openAfter = items.length - firstIncomplete;
  return doneBeforeGap && firstIncomplete <= 2 && openAfter >= 3;
}

function planPatternLine(
  items: PlanChecklistItem[],
  model: BurnoutViewModel,
): string | null {
  if (items.length === 0) return null;
  const { completed, total, percent } = planChecklistProgress(items);
  const open = total - completed;

  if (completed === total) {
    return "Your saved checklist is complete for now—that kind of follow-through matters.";
  }

  if (completed === 0 && total >= 5) {
    return `${total} steps are still untouched. Opening just one often softens the rest of the list.`;
  }

  if (open >= 6 && percent < 35 && model.composite >= 42) {
    return `${open} open steps may be a lot for where your bandwidth is in this snapshot.`;
  }

  if (stallPattern(items)) {
    return "Progress clusters at the top of the list while the middle waits—that pattern usually means the next chunk feels heavier, not that you’ve failed.";
  }

  const { sleepOpen, sleepDone } = sleepTaskCounts(items);
  if (sleepOpen >= 2 && sleepOpen > sleepDone) {
    return "Rest- and sleep-shaped steps are the ones most often left open—worth making those the smallest possible wins.";
  }

  if (open >= 4 && percent < 55 && model.topDrivers.length > 0) {
    return "Follow-through is partial while strain signals are still present—smaller plan slices tend to help more than pushing the full stack.";
  }

  return null;
}

function buildFrictionBullets(
  checkin: CheckinDetailResponse,
  model: BurnoutViewModel,
  checklistItems: PlanChecklistItem[],
): string[] {
  const intake = parseIntakeFromCheckin(checkin);
  const out: string[] = [];

  const pressures = intake.pressures
    .slice(0, 2)
    .map((p) => labelForStoredPressure(p));
  if (pressures.length > 0) {
    out.push(
      `You named real pressure around ${joinReadable(pressures)}—that context still matters for how you pace yourself.`,
    );
  }

  const symptomIds = [...new Set(checkin.symptoms ?? [])].slice(0, 2);
  if (symptomIds.length > 0) {
    const labels = symptomIds.map((id) => labelSymptom(id));
    out.push(
      `This snapshot also reflects ${joinReadable(labels)}—worth treating as signal, not a verdict.`,
    );
  }

  for (const line of model.needsAttention) {
    if (out.length >= 5) break;
    const trimmed = line.trim();
    if (
      trimmed &&
      !out.some((o) => o.toLowerCase().includes(trimmed.slice(0, 24).toLowerCase()))
    ) {
      out.push(trimmed);
    }
  }

  const planLine = planPatternLine(checklistItems, model);
  if (planLine && !out.some((o) => o.includes(planLine.slice(0, 28)))) {
    out.push(planLine);
  }

  const goals = intake.help_needs.slice(0, 2).map((g) => labelForStoredGoal(g));
  if (goals.length > 0) {
    out.push(
      `You asked for support with ${joinReadable(goals)}—we can aim moves there without asking for everything at once.`,
    );
  }

  if (intake.help_other_text?.trim()) {
    out.push(`In your words: “${truncate(intake.help_other_text.trim(), 140)}”`);
  }

  if (out.length === 0) {
    const lift = model.helping[0]?.trim();
    out.push(
      lift ??
        "This snapshot is gentle-edged—still enough to pace yourself without chasing a crisis narrative.",
    );
  }

  return out.slice(0, 4);
}

function planFollowThroughRowsFromPlans(
  plans: StoredPlan[],
): PlanFollowThroughRow[] {
  return plans.slice(0, 3).map((p) => {
    const { completed, total, percent } = planChecklistProgress(
      p.checklist_items,
    );
    return {
      id: p.id,
      title: p.title?.trim() || "Saved plan",
      completed,
      total,
      percent,
    };
  });
}

function recoveryScore(model: BurnoutViewModel): number {
  return model.dimensions.find((d) => d.id === "recovery")?.score ?? 0;
}

function alternateAction(
  recs: { id: OverviewNextMoveKind }[],
  primary: OverviewNextMoveKind,
): NextBestStepModel["backup"] {
  const alt = recs.find((r) => r.id !== primary);
  if (alt) return { kind: alt.id, label: overviewActionLabel(alt.id) };
  if (primary !== "chat") {
    return { kind: "chat", label: overviewActionLabel("chat") };
  }
  return null;
}

function buildNextBestStep(
  checkin: CheckinDetailResponse,
  model: BurnoutViewModel,
  plans: StoredPlan[],
): NextBestStepModel {
  const items = plans[0]?.checklist_items ?? [];
  const prog = planChecklistProgress(items);
  const nextTask = nextUnfinishedChecklistTask(items);
  const open = prog.total - prog.completed;
  const recs = overviewBestServices(model, plans, checkin.created_at);

  const unevenSleep =
    checkin.sleep_consistency === "very_inconsistent" ||
    checkin.sleep_consistency === "somewhat_consistent";
  if (unevenSleep && recoveryScore(model) >= 42) {
    return {
      headline: "Stabilize one corner of your night",
      body: "Your check-in suggests sleep rhythm is uneven—before big goals, a single wind-down cue or steadier wake time often moves more than another full task.",
      kind: "plan",
      actionLabel: overviewActionLabel("plan"),
      backup: alternateAction(recs, "plan"),
    };
  }

  if (prog.total >= 6 && open >= 5 && prog.percent < 50) {
    return {
      headline: "Right-size the list",
      body: `${open} open steps can feel like one heavy wall. In Plan, edit down to what honestly fits this week—less can mean more follow-through.`,
      kind: "plan",
      actionLabel: overviewActionLabel("plan"),
      backup: alternateAction(recs, "plan"),
    };
  }

  const { sleepOpen, sleepDone } = sleepTaskCounts(items);
  if (sleepOpen >= 2 && sleepOpen > sleepDone) {
    return {
      headline: "Let rest steps be tiny",
      body: "Sleep- and rest-related checklist items are mostly waiting. Pick the smallest one first—five mindful minutes still counts.",
      kind: "plan",
      actionLabel: overviewActionLabel("plan"),
      backup: alternateAction(recs, "plan"),
    };
  }

  if (stallPattern(items)) {
    return {
      headline: "Unstick the middle",
      body: "You’ve cleared the opening steps while a chunk in the middle waits. Try splitting one mid-list item or moving it above something lighter.",
      kind: "plan",
      actionLabel: overviewActionLabel("plan"),
      backup: alternateAction(recs, "plan"),
    };
  }

  if (nextTask && prog.completed > 0 && prog.percent < 90) {
    const te = nextTask.timeEstimate;
    return {
      headline: truncate(`When you have a pocket: ${nextTask.label}`, 56),
      body: te
        ? `Roughly ${te}—one honest block, no heroics. Finishing this keeps your plan lined up with how you said you’re doing.`
        : "One focused pass on this step is enough for today—it keeps your plan honest with your check-in.",
      kind: "plan",
      actionLabel: overviewActionLabel("plan"),
      backup: alternateAction(recs, "plan"),
    };
  }

  const picked = pickOverviewNextMove(model, plans, checkin.created_at);
  return {
    headline: picked.headline,
    body: picked.detail,
    kind: picked.kind,
    actionLabel: picked.actionLabel,
    backup: alternateAction(recs, picked.kind),
  };
}

export function buildOverviewSupportSurface(
  checkin: CheckinDetailResponse,
  model: BurnoutViewModel,
  plans: StoredPlan[],
  riskHeading: string,
): OverviewSupportSurface {
  const checklistItems = plans[0]?.checklist_items ?? [];

  const primaryFocus =
    riskHeading.trim() || overviewTopDriverLine(model);

  let plainInsight = model.summaryLine.trim();
  const pfShort = primaryFocus.slice(0, 14).toLowerCase();
  if (
    pfShort.length >= 8 &&
    plainInsight.toLowerCase().startsWith(pfShort) &&
    model.sinceLastCheckinLine?.trim()
  ) {
    plainInsight = model.sinceLastCheckinLine.trim();
  }
  if (plainInsight.length > 240) {
    plainInsight = `${plainInsight.slice(0, 237)}…`;
  }
  if (!plainInsight) {
    plainInsight =
      "We’re reading this as an early support snapshot—useful for pacing, not for labeling you.";
  }

  return {
    state: {
      band: model.band,
      bandLabel: model.bandLabel,
      primaryFocus,
      plainInsight,
    },
    friction: {
      title: "What we’re noticing",
      bullets: buildFrictionBullets(checkin, model, checklistItems),
    },
    planFollowThroughRows: planFollowThroughRowsFromPlans(plans),
    savedPlanCount: plans.length,
    nextStep: buildNextBestStep(checkin, model, plans),
  };
}
