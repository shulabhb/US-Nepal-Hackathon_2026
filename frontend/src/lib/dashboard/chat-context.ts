import { buildPlanCheckinContext } from "@/lib/api/ai";
import {
  overviewTopDriverLine,
  type BurnoutViewModel,
} from "@/lib/burnout/burnout-view-model";
import {
  nextUnfinishedChecklistTask,
  planChecklistProgress,
} from "@/lib/dashboard/plan-checklist";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

/** Compact burnout summary for chat API (rule-based, non-clinical). */
export function buildBurnoutChatContext(
  model: BurnoutViewModel,
): Record<string, unknown> {
  const sorted = [...model.dimensions].sort((a, b) => b.score - a.score);
  const lead = sorted[0];
  return {
    band: model.band,
    band_label: model.bandLabel,
    composite_score: model.composite,
    top_driver: (
      model.topDrivers[0] ?? overviewTopDriverLine(model)
    ).slice(0, 280),
    overall_trend_hint:
      model.sinceLastCheckinLine ?? model.overallTrendHint ?? null,
    summary_line: model.summaryLine,
    overall_strain_trend: model.overallStrainTrend,
    leading_dimension: lead
      ? { id: lead.id, label: lead.label, strain_score: lead.score }
      : null,
  };
}

/** Rich context for the newest saved plan (primary). */
export function buildActivePlanContext(
  plan: StoredPlan,
): Record<string, unknown> {
  const pr = planChecklistProgress(plan.checklist_items);
  const next = nextUnfinishedChecklistTask(plan.checklist_items);
  const summaryShort =
    plan.summary.length > 320
      ? `${plan.summary.slice(0, 317)}…`
      : plan.summary;
  return {
    id: plan.id,
    title: plan.title,
    plan_type: plan.plan_type,
    summary: plan.summary,
    short_summary: summaryShort,
    time_horizon: plan.time_horizon,
    created_at: plan.created_at,
    progress_percent: pr.percent,
    completion_percent: pr.percent,
    tasks_completed: pr.completed,
    tasks_total: pr.total,
    completed_count: pr.completed,
    total_count: pr.total,
    next_unfinished_task: next,
    checklist_items: plan.checklist_items.map((i) => ({
      label: i.label,
      description: i.description ?? null,
      time_estimate: i.time_estimate ?? null,
      completed: i.completed === true,
    })),
  };
}

/** Compact rows for other plans (and room for dashboard analytics later). */
export function buildSavedPlanSummaries(
  plans: StoredPlan[],
  skipFirst: boolean,
): Record<string, unknown>[] {
  const rest = skipFirst && plans.length > 0 ? plans.slice(1) : plans;
  return rest.slice(0, 6).map((p) => {
    const pr = planChecklistProgress(p.checklist_items);
    return {
      id: p.id,
      title: p.title,
      plan_type: p.plan_type,
      summary:
        p.summary.length > 280 ? `${p.summary.slice(0, 277)}…` : p.summary,
      progress_percent: pr.percent,
      tasks_completed: pr.completed,
      tasks_total: pr.total,
      saved_at: p.created_at,
    };
  });
}

export function buildLatestCheckinPayload(
  checkin: CheckinDetailResponse,
): Record<string, unknown> {
  return buildPlanCheckinContext(checkin);
}
