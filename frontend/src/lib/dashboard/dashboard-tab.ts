export const DASHBOARD_TAB_IDS = [
  "overview",
  "chat",
  "plan",
  "burnout",
] as const;

export type DashboardTabId = (typeof DASHBOARD_TAB_IDS)[number];

/** Old query values → current tab (for bookmarks and deep links). */
const LEGACY_TAB_QUERY: Record<string, DashboardTabId> = {
  checkins: "burnout",
  insights: "burnout",
};

export function isDashboardTabId(value: string): value is DashboardTabId {
  return (DASHBOARD_TAB_IDS as readonly string[]).includes(value);
}

export function legacyDashboardTabRedirect(
  raw: string | null | undefined,
): DashboardTabId | null {
  if (raw == null || raw === "") return null;
  return LEGACY_TAB_QUERY[raw] ?? null;
}

export function normalizeDashboardTab(
  raw: string | null | undefined,
): DashboardTabId {
  const legacy = legacyDashboardTabRedirect(raw);
  if (legacy) return legacy;
  if (raw && isDashboardTabId(raw)) return raw;
  return "overview";
}

/** Opens Support Chat and auto-starts the guided plan flow (see `SupportChatPanel`). */
export const CHAT_SEED_QUICK_PLAN = "quick-plan";

/**
 * Dashboard deep link. Pass `extra` to add query pairs (e.g. `{ chatSeed: CHAT_SEED_QUICK_PLAN }` with `tab=chat`).
 */
export function dashboardHref(
  tab: DashboardTabId,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  return `/dashboard?${params.toString()}`;
}
