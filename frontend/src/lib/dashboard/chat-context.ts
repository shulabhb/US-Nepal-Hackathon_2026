import { buildPlanCheckinContext } from "@/lib/api/ai";
import { planChecklistProgress } from "@/lib/dashboard/plan-checklist";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

/** Rich context for the newest saved plan (primary). */
export function buildActivePlanContext(
  plan: StoredPlan,
): Record<string, unknown> {
  const pr = planChecklistProgress(plan.checklist_items);
  return {
    id: plan.id,
    title: plan.title,
    plan_type: plan.plan_type,
    summary: plan.summary,
    time_horizon: plan.time_horizon,
    created_at: plan.created_at,
    progress_percent: pr.percent,
    tasks_completed: pr.completed,
    tasks_total: pr.total,
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
