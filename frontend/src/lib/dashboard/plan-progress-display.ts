import { isPlanMarkedCompleteByUser } from "@/lib/burnout/burnout-view-model";
import { planChecklistProgress } from "@/lib/dashboard/plan-checklist";
import type { StoredPlan } from "@/types/api";

/**
 * Progress for UI lists (overview follow-through, plan sidebar). When the user marked
 * the plan complete (`plan_meta`), show 100% even if stored checklist `completed`
 * flags are missing or out of sync.
 */
export function planProgressForDisplay(plan: StoredPlan): {
  completed: number;
  total: number;
  percent: number;
} {
  const base = planChecklistProgress(plan.checklist_items ?? []);
  if (isPlanMarkedCompleteByUser(plan) && base.total > 0) {
    return {
      completed: base.total,
      total: base.total,
      percent: 100,
    };
  }
  return base;
}
