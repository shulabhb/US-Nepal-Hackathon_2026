import type { StoredPlan } from "@/types/api";

/**
 * Newest-first slice shown on the dashboard overview (“Plan follow-through”) and
 * the Plan tab sidebar — keeps both in sync with GET /plans ordering.
 */
export const DASHBOARD_RECENT_PLANS_LIMIT = 3;

export function recentPlansForDashboard(plans: StoredPlan[]): StoredPlan[] {
  return plans.slice(0, DASHBOARD_RECENT_PLANS_LIMIT);
}
