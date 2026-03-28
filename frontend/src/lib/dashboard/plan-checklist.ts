import type { PlanChecklistItem } from "@/types/api";

/** Derived progress for dashboards and plan headers (0–100). */
export function planChecklistProgress(items: PlanChecklistItem[]) {
  const total = items.length;
  const completed = items.filter((i) => i.completed === true).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

function coerceItemFields(item: PlanChecklistItem) {
  const legacy = item as PlanChecklistItem & { rationale?: string | null };
  const description =
    (item.description?.trim() || legacy.rationale?.trim() || "").trim() ||
    "Details for this step weren’t stored.";
  const time_estimate =
    (item.time_estimate?.trim() || "").trim() || "Flexible";
  const label = (item.label?.trim() || "Task").trim();
  const additional_info = item.additional_info?.trim() || null;
  return { label, description, time_estimate, additional_info };
}

/**
 * Full checklist rows for PATCH /plans/{id} — satisfies backend PlanChecklistItem.
 */
export function normalizeChecklistForApi(
  items: PlanChecklistItem[],
): PlanChecklistItem[] {
  return items.map((item) => {
    const c = coerceItemFields(item);
    return {
      ...item,
      ...c,
      completed: item.completed === true,
    };
  });
}
