import type { PlanChecklistItem } from "@/types/api";

/** Derived progress for dashboards and plan headers (0–100). */
export function planChecklistProgress(items: PlanChecklistItem[]) {
  const total = items.length;
  const completed = items.filter((i) => i.completed === true).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

/** First checklist row not marked complete — for chat / dashboard hints. */
export function nextUnfinishedChecklistTask(
  items: PlanChecklistItem[],
): {
  label: string;
  description: string | null;
  timeEstimate: string | null;
} | null {
  const item = items.find((i) => i.completed !== true);
  if (!item) return null;
  const label = item.label?.trim() ?? "";
  if (!label) return null;
  const legacy = item as PlanChecklistItem & { rationale?: string | null };
  const rawDesc =
    item.description?.trim() || legacy.rationale?.trim() || "";
  const description =
    rawDesc.length > 0 ? rawDesc.slice(0, 280) : null;
  const te = (item.time_estimate?.trim() || "").trim();
  const timeEstimate = te.length > 0 ? te : null;
  return { label, description, timeEstimate };
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
