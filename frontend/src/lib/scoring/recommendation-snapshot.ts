import type { RecommendationSnapshot } from "@/types/api";

import type { RecommendationResult } from "./recommendation-engine";

export function toRecommendationSnapshot(
  rec: RecommendationResult,
): RecommendationSnapshot {
  return {
    risk_label: rec.riskLabel,
    risk_score: rec.riskScore,
    summary: rec.summary,
    reasons: [...rec.reasons],
    immediate_actions: [...rec.immediateActions],
    next_72_hour_plan: [...rec.next72HourPlan],
    ...(rec.supportRoute?.length
      ? { support_route: [...rec.supportRoute] }
      : {}),
  };
}
