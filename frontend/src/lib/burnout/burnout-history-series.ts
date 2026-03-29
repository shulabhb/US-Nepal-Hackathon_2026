import type { CheckinDetailResponse } from "@/types/api";

import { buildBurnoutViewModel } from "./burnout-view-model";
import type { BurnoutDimensionId } from "./burnout-view-model";

export type StrainHistoryPoint = {
  id: string;
  createdAt: string;
  labelShort: string;
  composite: number;
  dimensions: { id: BurnoutDimensionId; label: string; score: number }[];
};

function formatShortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * One point per check-in, oldest → newest. Uses plan-agnostic snapshots so the
 * line compares the same rule-based readout across saves.
 */
export function buildStrainHistorySeries(
  rows: CheckinDetailResponse[],
): StrainHistoryPoint[] {
  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  return sorted.map((row, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const vm = buildBurnoutViewModel(row, {
      previousCheckin: prev,
      latestPlanChecklist: null,
    });
    return {
      id: row.id,
      createdAt: row.created_at,
      labelShort: formatShortDate(row.created_at),
      composite: vm.composite,
      dimensions: vm.dimensions.map((d) => ({
        id: d.id as BurnoutDimensionId,
        label: d.label,
        score: d.score,
      })),
    };
  });
}
