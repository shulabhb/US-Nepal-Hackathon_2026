import type { OnboardingSymptom, OnboardingStep2 } from "@/lib/onboarding/step-two";
import type { OnboardingStep3 } from "@/lib/onboarding/step-three";

export type RiskBandId =
  | "mild"
  | "building"
  | "rising"
  | "high"
  | "support";

export const RISK_BAND_LABELS: Record<RiskBandId, string> = {
  mild: "Mild stress",
  building: "Building pressure",
  rising: "Rising burnout risk",
  high: "High pressure, low recovery",
  support: "Support recommended soon",
};

export type BurnoutScoreResult = {
  score: number;
  bandId: RiskBandId;
  riskLabel: string;
  reasons: string[];
};

const SYMPTOM_EXTRA_POINTS: Partial<Record<OnboardingSymptom, number>> = {
  skipped_class_work: 2,
  social_withdrawal: 2,
  feeling_stuck: 2,
};

export function getRiskBand(score: number): {
  bandId: RiskBandId;
  riskLabel: string;
} {
  if (score <= 4) {
    return { bandId: "mild", riskLabel: RISK_BAND_LABELS.mild };
  }
  if (score <= 8) {
    return { bandId: "building", riskLabel: RISK_BAND_LABELS.building };
  }
  if (score <= 12) {
    return { bandId: "rising", riskLabel: RISK_BAND_LABELS.rising };
  }
  if (score <= 16) {
    return { bandId: "high", riskLabel: RISK_BAND_LABELS.high };
  }
  return { bandId: "support", riskLabel: RISK_BAND_LABELS.support };
}

/**
 * Deterministic score from step 2 (symptoms, stress, energy) and step 3 (sleep).
 * Higher score = more strain signals stacked together—not a diagnosis.
 */
export function computeBurnoutScore(
  step2: OnboardingStep2,
  step3: OnboardingStep3,
): BurnoutScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (step2.stressLevel >= 8) {
    score += 3;
    reasons.push(
      "Your stress level is in the upper range right now, which often means your nervous system is working overtime.",
    );
  } else if (step2.stressLevel >= 6) {
    score += 2;
    reasons.push(
      "Stress is elevated—not necessarily “crisis,” but worth taking seriously before it snowballs.",
    );
  }

  if (step2.energyLevel <= 3) {
    score += 3;
    reasons.push(
      "Energy has been very low lately. That pattern usually shows up when recovery hasn’t kept pace with demand.",
    );
  } else if (step2.energyLevel <= 5) {
    score += 2;
    reasons.push(
      "Energy is running thinner than ideal—often an early sign that reserves are dipping.",
    );
  }

  const symptoms = [...new Set(step2.symptoms)];
  for (const _ of symptoms) {
    score += 1;
  }
  if (symptoms.length > 0) {
    reasons.push(
      `You selected ${symptoms.length} signal${symptoms.length === 1 ? "" : "s"} that commonly travel with overload—your experience is showing up clearly in the check-in.`,
    );
  }

  for (const key of symptoms) {
    const extra = SYMPTOM_EXTRA_POINTS[key];
    if (extra) {
      score += extra;
    }
  }
  if (symptoms.includes("skipped_class_work")) {
    reasons.push(
      "Skipping class or work is a strong “something’s slipping” signal—it’s worth a gentler load, not self-blame.",
    );
  }
  if (symptoms.includes("social_withdrawal")) {
    reasons.push(
      "Pulling back from people often pairs with burnout risk; it doesn’t mean you’ve failed—your system may be conserving energy.",
    );
  }
  if (symptoms.includes("feeling_stuck")) {
    reasons.push(
      "Feeling stuck can mean you’re running on obligation with too little room to reset.",
    );
  }

  switch (step3.duration) {
    case "lt_5":
      score += 4;
      reasons.push(
        "Sleep duration looks very short—recovery runway is likely narrow.",
      );
      break;
    case "h_5_6":
      score += 3;
      reasons.push(
        "Sleep hours are on the low side; small sleep gains often move stress more than people expect.",
      );
      break;
    default:
      break;
  }

  if (step3.quality === "poor") {
    score += 2;
    reasons.push(
      "Sleep quality sounds rough—even “enough hours” won’t feel restoring if rest is fragmented or shallow.",
    );
  }

  if (step3.consistency === "very_inconsistent") {
    score += 2;
    reasons.push(
      "Sleep timing has been very inconsistent; bodies notice rhythm breaks even when intentions are good.",
    );
  } else if (step3.consistency === "somewhat_consistent") {
    score += 1;
    reasons.push(
      "Sleep rhythm is only somewhat steady, which can quietly add to daytime strain.",
    );
  }

  const { bandId, riskLabel } = getRiskBand(score);

  return { score, bandId, riskLabel, reasons };
}
