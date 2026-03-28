export const DASHBOARD_TAB_IDS = [
  "overview",
  "chat",
  "plan",
  "checkins",
  "insights",
] as const;

export type DashboardTabId = (typeof DASHBOARD_TAB_IDS)[number];

export function isDashboardTabId(value: string): value is DashboardTabId {
  return (DASHBOARD_TAB_IDS as readonly string[]).includes(value);
}

export function normalizeDashboardTab(
  raw: string | null | undefined,
): DashboardTabId {
  if (raw && isDashboardTabId(raw)) return raw;
  return "overview";
}

export function dashboardHref(tab: DashboardTabId): string {
  return `/dashboard?tab=${tab}`;
}
