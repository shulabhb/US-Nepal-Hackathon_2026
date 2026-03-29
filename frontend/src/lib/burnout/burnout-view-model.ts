/**
 * Rule-based burnout interpretation from saved check-ins.
 * Non-clinical, deterministic — not a diagnosis.
 */

import { planChecklistProgress } from "@/lib/dashboard/plan-checklist";
import { parseIntakeFromCheckin } from "@/lib/dashboard/checkin-view-model";
import type {
  CheckinDetailResponse,
  CheckinHistoryItem,
  PlanChecklistItem,
  StoredPlan,
} from "@/types/api";
import type { SleepDurationBucket } from "@/lib/onboarding/step-three";

export type BurnoutRiskBand = "low" | "emerging" | "moderate" | "high";

export type BurnoutDimensionId =
  | "overload"
  | "depletion"
  | "recovery"
  | "functional_strain";

export type BurnoutDimension = {
  id: BurnoutDimensionId;
  label: string;
  /** 0–100, higher = more strain on this dimension */
  score: number;
  hint: string;
};

/** Overall strain vs last check-in — higher composite = worse. */
export type BurnoutStrainTrend = "worsening" | "steady" | "improving";

/** Per-dimension strain change (higher score = more strain). */
export type BurnoutDimensionTrend = "rising" | "stable" | "easing";

/** Raw metric direction on 1–10 scales (stress up = more stressful; energy up = more energy). */
export type RawMetricTrend = "up" | "flat" | "down";

export type BurnoutViewModel = {
  band: BurnoutRiskBand;
  /** Display label e.g. "Moderate" */
  bandLabel: string;
  /** 0–100 blended strain */
  composite: number;
  /** Previous snapshot composite when a prior check-in exists */
  previousComposite: number | null;
  summaryLine: string;
  dimensions: BurnoutDimension[];
  /** Per-dimension trend vs previous snapshot; null when no previous */
  dimensionTrends: Partial<Record<BurnoutDimensionId, BurnoutDimensionTrend>>;
  /** Overall strain vs last save */
  overallStrainTrend: BurnoutStrainTrend | null;
  /** Short line for the main meter (e.g. “Holding about steady…”) */
  overallTrendHint: string | null;
  stressTrend: RawMetricTrend | null;
  energyTrend: RawMetricTrend | null;
  /** Recovery dimension only — plan-aware nuance stays out unless both have plans */
  recoveryStrainTrend: BurnoutStrainTrend | null;
  /** One or two sentences, deterministic */
  sinceLastCheckinLine: string | null;
  topDrivers: string[];
  helping: string[];
  needsAttention: string[];
  disclaimer: string;
};

const STANDARD_DISCLAIMER =
  "Early support signal from your check-in—not a diagnosis, medical advice, or crisis screen.";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function roundScore(n: number): number {
  return Math.round(clamp(n, 0, 100));
}

const OVERLOAD_SYMPTOMS = new Set([
  "overthinking",
  "panic_before_deadlines",
  "irritability",
]);
const DEPLETION_SYMPTOMS = new Set([
  "low_energy",
  "lack_of_motivation",
  "feeling_stuck",
  "social_withdrawal",
]);
const FUNCTIONAL_SYMPTOMS = new Set([
  "difficulty_focusing",
  "skipped_class_work",
]);

function durationStrain(bucket: string): number {
  const m: Record<SleepDurationBucket, number> = {
    lt_5: 88,
    h_5_6: 62,
    h_6_7: 42,
    h_7_8: 22,
    gt_8: 18,
  };
  return m[bucket as SleepDurationBucket] ?? 45;
}

function qualityStrain(q: string): number {
  if (q === "poor") return 72;
  if (q === "okay") return 42;
  if (q === "good") return 18;
  return 45;
}

function consistencyStrain(c: string): number {
  if (c === "very_inconsistent") return 58;
  if (c === "somewhat_consistent") return 32;
  if (c === "consistent") return 16;
  return 36;
}

function planFollowThroughStrain(items: PlanChecklistItem[] | null): number {
  if (!items?.length || items.length < 3) return 0;
  const { percent } = planChecklistProgress(items);
  if (percent >= 55) return 0;
  if (percent >= 35) return 14;
  if (percent >= 20) return 26;
  return 36;
}

export function bandFromComposite(c: number): { band: BurnoutRiskBand; label: string } {
  if (c < 28) return { band: "low", label: "Low" };
  if (c < 46) return { band: "emerging", label: "Emerging" };
  if (c < 63) return { band: "moderate", label: "Moderate" };
  return { band: "high", label: "High" };
}

export type BuildBurnoutViewModelOptions = {
  /** Second item in history (older than latest), if available */
  previousCheckin?: CheckinDetailResponse | null;
  /** Newest saved plan checklist, if any — for light follow-through signal */
  latestPlanChecklist?: PlanChecklistItem[] | null;
};

function buildTopDrivers(ctx: {
  stress: number;
  energy: number;
  sleepDuration: string;
  sleepQuality: string;
  sleepConsistency: string;
  pressureCount: number;
  symptoms: string[];
  planStrain: number;
}): string[] {
  const out: string[] = [];

  if (ctx.stress >= 8) {
    out.push("High reported stress");
  } else if (ctx.stress >= 6) {
    out.push("Elevated stress");
  }

  if (ctx.energy <= 3) {
    out.push("Very low energy");
  } else if (ctx.energy <= 5) {
    out.push("Low energy");
  }

  if (ctx.sleepDuration === "lt_5") {
    out.push("Very short sleep");
  } else if (ctx.sleepDuration === "h_5_6") {
    out.push("Short nights");
  }

  if (ctx.sleepQuality === "poor") {
    out.push("Poor sleep quality");
  }

  if (ctx.sleepConsistency === "very_inconsistent") {
    out.push("Inconsistent sleep rhythm");
  } else if (ctx.sleepConsistency === "somewhat_consistent") {
    out.push("Somewhat uneven sleep");
  }

  if (ctx.pressureCount >= 3) {
    out.push("Several pressure areas at once");
  } else if (ctx.pressureCount === 2) {
    out.push("Multiple pressure areas");
  }

  if (ctx.symptoms.includes("difficulty_focusing")) {
    out.push("Difficulty focusing");
  }
  if (ctx.symptoms.includes("skipped_class_work")) {
    out.push("Skipped class or work");
  }
  if (ctx.symptoms.includes("overthinking")) {
    out.push("Overthinking / mental load");
  }
  if (ctx.symptoms.includes("panic_before_deadlines")) {
    out.push("Panic before deadlines");
  }
  if (ctx.symptoms.includes("lack_of_motivation")) {
    out.push("Low motivation");
  }
  if (ctx.symptoms.includes("social_withdrawal")) {
    out.push("Social withdrawal");
  }
  if (ctx.planStrain >= 20) {
    out.push("Plan follow-through is lagging");
  }

  // Unique, preserve order, cap 5
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of out) {
    if (seen.has(s)) continue;
    seen.add(s);
    uniq.push(s);
    if (uniq.length >= 5) break;
  }
  return uniq;
}

function buildHelping(ctx: {
  stress: number;
  energy: number;
  sleepQuality: string;
  sleepConsistency: string;
  pressureCount: number;
  planStrain: number;
  hadPlanChecklist: boolean;
}): string[] {
  const h: string[] = [];
  if (ctx.stress <= 5) {
    h.push("Stress is on the milder side in this snapshot.");
  }
  if (ctx.energy >= 7) {
    h.push("Energy has more room than on heavier days.");
  }
  if (ctx.sleepQuality === "good") {
    h.push("Sleep quality reads as solid for recovery.");
  }
  if (ctx.sleepConsistency === "consistent") {
    h.push("Sleep timing looks relatively steady.");
  }
  if (ctx.pressureCount <= 1) {
    h.push("Pressure sources look fewer or more focused.");
  }
  if (ctx.hadPlanChecklist && ctx.planStrain === 0) {
    h.push("Saved plan steps look reasonably in motion.");
  }
  return h.slice(0, 4);
}

function buildNeedsAttention(
  drivers: string[],
  extra: string[],
): string[] {
  const fromDrivers = drivers.slice(0, 4).map((d) => {
    if (d === "High reported stress") return "Stress may need gentler pacing soon.";
    if (d === "Elevated stress") return "Stress is worth tracking so it doesn’t stack.";
    if (d === "Very low energy" || d === "Low energy")
      return "Energy dips are pulling on your bandwidth.";
    if (d === "Very short sleep" || d === "Short nights")
      return "Sleep hours are tight for steady recovery.";
    if (d === "Poor sleep quality") return "Sleep isn’t feeling very restorative yet.";
    if (d === "Inconsistent sleep rhythm" || d === "Somewhat uneven sleep")
      return "Night-to-night rhythm is uneven.";
    if (d === "Several pressure areas at once" || d === "Multiple pressure areas")
      return "Several demands are competing at once.";
    if (d === "Difficulty focusing") return "Attention and focus are under strain.";
    if (d === "Skipped class or work") return "Avoidance or pull-away at school/work showed up.";
    if (d === "Plan follow-through is lagging")
      return "Small steps on your plan may need simplifying.";
    return `${d}—worth a closer look this week.`;
  });
  const merged = [...fromDrivers, ...extra];
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const s of merged) {
    if (seen.has(s)) continue;
    seen.add(s);
    uniq.push(s);
    if (uniq.length >= 5) break;
  }
  return uniq;
}

function buildSummaryLine(args: {
  band: BurnoutRiskBand;
  dimensions: BurnoutDimension[];
}): string {
  const sorted = [...args.dimensions].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  let core: string;

  if (args.band === "low") {
    core =
      "Your latest check-in looks relatively steady overall. Small habits still matter, but nothing screams urgent overload here.";
  } else if (!top || top.score < 35) {
    core =
      "Signals are mixed. Worth noticing a few strain areas without assuming the worst.";
  } else if (top.id === "overload" && second && second.id === "recovery") {
    core =
      "Recent signals suggest rising load with recovery still catching up—pace and basics tend to help most.";
  } else if (top.id === "overload") {
    core =
      "Overload and pressure are leading this snapshot—margin and boundaries are the usual levers.";
  } else if (top.id === "depletion") {
    core =
      "Energy and motivation are pulling the picture toward depletion—gentle replenishment beats pushing harder.";
  } else if (top.id === "recovery") {
    core =
      "Sleep and recovery rhythms are the main strain—nights are doing a lot of the talking.";
  } else {
    core =
      "Day-to-day functioning looks stretched—smaller, doable steps usually beat big overhauls.";
  }

  return core;
}

export type BurnoutSnapshot = {
  overload: number;
  depletion: number;
  recovery: number;
  functional_strain: number;
  composite: number;
  band: BurnoutRiskBand;
  bandLabel: string;
  dimensions: BurnoutDimension[];
  topDrivers: string[];
  helping: string[];
  needsAttention: string[];
  stress: number;
  energy: number;
  pressureLen: number;
  symptoms: string[];
  planStrain: number;
};

function computeBurnoutSnapshot(
  checkin: CheckinDetailResponse,
  latestPlanChecklist: PlanChecklistItem[] | null | undefined,
): BurnoutSnapshot {
  const intake = parseIntakeFromCheckin(checkin);
  const symptoms = checkin.symptoms ?? [];
  const stress = clamp(checkin.stress_level, 1, 10);
  const energy = clamp(checkin.energy_level, 1, 10);

  const stress01 = (stress - 1) / 9;
  const energyDrain = (10 - energy) / 9;

  let overloadSymptomBump = 0;
  for (const s of symptoms) {
    if (OVERLOAD_SYMPTOMS.has(s)) overloadSymptomBump += 12;
  }
  overloadSymptomBump = clamp(overloadSymptomBump, 0, 36);

  const pressureLen = intake.pressures.length;
  const pressureBump = clamp(Math.max(0, pressureLen - 1) * 14, 0, 40);

  const overload = roundScore(
    stress01 * 100 * 0.62 + pressureBump * 0.55 + overloadSymptomBump * 0.85,
  );

  let depletionSymptomBump = 0;
  for (const s of symptoms) {
    if (DEPLETION_SYMPTOMS.has(s)) depletionSymptomBump += 11;
  }
  depletionSymptomBump = clamp(depletionSymptomBump, 0, 40);
  const hasLowEnergySymptom = symptoms.includes("low_energy");
  if (hasLowEnergySymptom) depletionSymptomBump += 8;

  const depletion = roundScore(
    energyDrain * 100 * 0.58 + depletionSymptomBump,
  );

  const recD = durationStrain(checkin.sleep_duration);
  const recQ = qualityStrain(checkin.sleep_quality);
  const recC = consistencyStrain(checkin.sleep_consistency);
  const poorSleepTag = symptoms.includes("poor_sleep") ? 14 : 0;
  const recovery = roundScore((recD + recQ + recC) / 3 + poorSleepTag);

  const planStrain = planFollowThroughStrain(latestPlanChecklist ?? null);

  let functionalBase = 0;
  for (const s of symptoms) {
    if (s === "difficulty_focusing") functionalBase += 34;
    if (s === "skipped_class_work") functionalBase += 38;
  }
  const functional_strain = roundScore(
    clamp(functionalBase + planStrain, 0, 100),
  );

  const composite = roundScore(
    overload * 0.27 +
      depletion * 0.27 +
      recovery * 0.26 +
      functional_strain * 0.2,
  );

  const { band, label: bandLabel } = bandFromComposite(composite);

  const dimensions: BurnoutDimension[] = [
    {
      id: "overload",
      label: "Overload",
      score: overload,
      hint: "Demands, pressure, and mental load.",
    },
    {
      id: "depletion",
      label: "Depletion",
      score: depletion,
      hint: "Energy, motivation, and emotional reserves.",
    },
    {
      id: "recovery",
      label: "Recovery gap",
      score: recovery,
      hint: "Sleep hours, quality, and rhythm (higher = more recovery strain).",
    },
    {
      id: "functional_strain",
      label: "Functional strain",
      score: functional_strain,
      hint: "Focus, follow-through, and day-to-day functioning.",
    },
  ];

  const topDrivers = buildTopDrivers({
    stress,
    energy,
    sleepDuration: checkin.sleep_duration,
    sleepQuality: checkin.sleep_quality,
    sleepConsistency: checkin.sleep_consistency,
    pressureCount: pressureLen,
    symptoms,
    planStrain,
  });

  const hadPlanChecklist = (latestPlanChecklist?.length ?? 0) >= 3;
  const helping = buildHelping({
    stress,
    energy,
    sleepQuality: checkin.sleep_quality,
    sleepConsistency: checkin.sleep_consistency,
    pressureCount: pressureLen,
    planStrain,
    hadPlanChecklist,
  });

  const extraAttention: string[] = [];
  if (topDrivers.length === 0 && band !== "low" && composite >= 40) {
    extraAttention.push(
      "Signals are borderline—check the dimension cards for where strain clusters.",
    );
  }

  const needsAttention = buildNeedsAttention(topDrivers, extraAttention);

  return {
    overload,
    depletion,
    recovery,
    functional_strain,
    composite,
    band,
    bandLabel,
    dimensions,
    topDrivers,
    helping,
    needsAttention,
    stress,
    energy,
    pressureLen,
    symptoms,
    planStrain,
  };
}

function overallStrainTrendFromDelta(delta: number): BurnoutStrainTrend {
  if (delta >= 5) return "worsening";
  if (delta <= -5) return "improving";
  return "steady";
}

function dimensionTrendScore(curr: number, prev: number): BurnoutDimensionTrend {
  const d = curr - prev;
  if (d >= 4) return "rising";
  if (d <= -4) return "easing";
  return "stable";
}

function rawMetricTrend(delta: number): RawMetricTrend {
  if (delta >= 1) return "up";
  if (delta <= -1) return "down";
  return "flat";
}

function hintForOverallStrainTrend(t: BurnoutStrainTrend): string {
  if (t === "worsening") return "Higher strain than your last check-in.";
  if (t === "improving") return "Slightly improved since last time.";
  return "Holding about steady since last time.";
}

function buildSinceLastCheckinLine(args: {
  hasPrevious: boolean;
  overallStrainTrend: BurnoutStrainTrend | null;
  stressTrend: RawMetricTrend | null;
  energyTrend: RawMetricTrend | null;
  dimensionTrends: Partial<Record<BurnoutDimensionId, BurnoutDimensionTrend>>;
  currentSnapshot: BurnoutSnapshot;
}): string | null {
  if (!args.hasPrevious) return null;

  const { stressTrend, energyTrend, dimensionTrends: dim } = args;
  const phrases: string[] = [];

  if (stressTrend === "down") phrases.push("stress looks lower");
  if (stressTrend === "up") phrases.push("stress has ticked up");
  if (energyTrend === "up") phrases.push("energy reads a bit stronger");
  if (energyTrend === "down") phrases.push("energy is softer than last time");

  if (dim.overload === "easing") phrases.push("overload appears to be easing");
  if (dim.overload === "rising") phrases.push("overload looks a bit heavier");
  if (dim.recovery === "easing") phrases.push("recovery strain is easing a little");
  if (dim.recovery === "rising")
    phrases.push("recovery is still strained or a bit more strained");
  if (dim.depletion === "rising") phrases.push("depletion looks heavier");
  if (dim.depletion === "easing") phrases.push("depletion is easing slightly");
  if (dim.functional_strain === "rising")
    phrases.push("functional strain is still present or heavier");
  if (dim.functional_strain === "easing")
    phrases.push("functional strain is easing a bit");

  const steadyOverall = args.overallStrainTrend === "steady";
  const allDimStable =
    (!dim.overload || dim.overload === "stable") &&
    (!dim.depletion || dim.depletion === "stable") &&
    (!dim.recovery || dim.recovery === "stable") &&
    (!dim.functional_strain || dim.functional_strain === "stable");

  if (
    steadyOverall &&
    allDimStable &&
    stressTrend === "flat" &&
    energyTrend === "flat"
  ) {
    if (args.currentSnapshot.depletion >= 52) {
      return "Your burnout picture looks fairly steady, with energy still lagging.";
    }
    return "Your burnout picture looks fairly steady since last time.";
  }

  if (phrases.length === 0) {
    if (args.overallStrainTrend === "improving") {
      return "Things look a little lighter than your last check-in overall—worth keeping the gentler pace.";
    }
    if (args.overallStrainTrend === "worsening") {
      return "Overall strain is up a notch since last time—small resets still help.";
    }
    return "Small shifts since your last check-in—see the dimension cards for detail.";
  }

  const joined = phrases.slice(0, 3).join(", ");
  const cap = joined.charAt(0).toUpperCase() + joined.slice(1);
  return `Since your last check-in, ${cap}.`;
}

/** Labels for dimension strain direction vs last check-in. */
export function labelDimensionTrend(
  t: BurnoutDimensionTrend | undefined,
  noPrevious: boolean,
): string {
  if (noPrevious) return "First snapshot";
  if (t === "rising") return "Rising";
  if (t === "easing") return "Easing";
  return "Stable";
}

function recoveryStrainTrendFromDimension(
  trend: BurnoutDimensionTrend | undefined,
): BurnoutStrainTrend | null {
  if (trend === "rising") return "worsening";
  if (trend === "easing") return "improving";
  if (trend === "stable") return "steady";
  return null;
}

/**
 * Derives a burnout-oriented view from the latest saved check-in.
 */
export function buildBurnoutViewModel(
  checkin: CheckinDetailResponse,
  options: BuildBurnoutViewModelOptions = {},
): BurnoutViewModel {
  const planList = options.latestPlanChecklist ?? null;
  const snap = computeBurnoutSnapshot(checkin, planList);
  const prev = options.previousCheckin ?? null;
  const prevSnap = prev ? computeBurnoutSnapshot(prev, null) : null;

  const summaryLine = buildSummaryLine({
    band: snap.band,
    dimensions: snap.dimensions,
  });

  const dimensionTrends: Partial<
    Record<BurnoutDimensionId, BurnoutDimensionTrend>
  > = {};
  let overallStrainTrend: BurnoutStrainTrend | null = null;
  let overallTrendHint: string | null = null;
  let stressTrend: RawMetricTrend | null = null;
  let energyTrend: RawMetricTrend | null = null;
  let recoveryStrainTrend: BurnoutStrainTrend | null = null;

  if (prevSnap) {
    overallStrainTrend = overallStrainTrendFromDelta(
      snap.composite - prevSnap.composite,
    );
    overallTrendHint = hintForOverallStrainTrend(overallStrainTrend);
    stressTrend = rawMetricTrend(snap.stress - prevSnap.stress);
    energyTrend = rawMetricTrend(snap.energy - prevSnap.energy);

    const pairs: readonly (readonly [
      BurnoutDimensionId,
      number,
      number,
    ])[] = [
      ["overload", snap.overload, prevSnap.overload],
      ["depletion", snap.depletion, prevSnap.depletion],
      ["recovery", snap.recovery, prevSnap.recovery],
      ["functional_strain", snap.functional_strain, prevSnap.functional_strain],
    ];
    for (const [id, cur, prv] of pairs) {
      dimensionTrends[id] = dimensionTrendScore(cur, prv);
    }

    recoveryStrainTrend = recoveryStrainTrendFromDimension(
      dimensionTrends.recovery,
    );
  }

  const sinceLastCheckinLine = buildSinceLastCheckinLine({
    hasPrevious: prevSnap != null,
    overallStrainTrend,
    stressTrend,
    energyTrend,
    dimensionTrends,
    currentSnapshot: snap,
  });

  return {
    band: snap.band,
    bandLabel: snap.bandLabel,
    composite: snap.composite,
    previousComposite: prevSnap?.composite ?? null,
    summaryLine,
    dimensions: snap.dimensions,
    dimensionTrends,
    overallStrainTrend,
    overallTrendHint,
    stressTrend,
    energyTrend,
    recoveryStrainTrend,
    sinceLastCheckinLine,
    topDrivers: snap.topDrivers,
    helping: snap.helping,
    needsAttention: snap.needsAttention,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

/** Placeholder view model when no check-in is saved yet (dashboard still usable). */
export function emptyBurnoutViewModel(): BurnoutViewModel {
  const dim = (
    id: BurnoutDimensionId,
    label: string,
    hint: string,
  ): BurnoutDimension => ({
    id,
    label,
    score: 0,
    hint,
  });
  return {
    band: "low",
    bandLabel: "Low",
    composite: 0,
    previousComposite: null,
    summaryLine: "",
    dimensions: [
      dim("overload", "Overload", "Demands, pressure, and mental load."),
      dim(
        "depletion",
        "Depletion",
        "Energy, motivation, and emotional reserves.",
      ),
      dim(
        "recovery",
        "Recovery gap",
        "Sleep hours, quality, and rhythm (higher = more recovery strain).",
      ),
      dim(
        "functional_strain",
        "Functional strain",
        "Focus, follow-through, and day-to-day functioning.",
      ),
    ],
    dimensionTrends: {},
    overallStrainTrend: null,
    overallTrendHint: null,
    stressTrend: null,
    energyTrend: null,
    recoveryStrainTrend: null,
    sinceLastCheckinLine: null,
    topDrivers: [],
    helping: [],
    needsAttention: [],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

/** Overview “What helps” when the user has not saved a check-in yet. */
export function overviewWhatHelpsWhenNoCheckin(): OverviewWhatHelpsContext {
  return {
    strainMetaLine: "No check-in yet · 0/100 strain",
    checkinEyebrow: "Your workspace",
    checkinHighlight: "Plan & chat anytime",
    primaryDriver:
      "You can use the dashboard anytime. Add a check-in when you want a personalized snapshot—optional, private, and easy to pause.",
    supportingDriver: null,
    snapshotSummaryLine: null,
  };
}

/**
 * Single line for Overview “main driver” when topDrivers is empty.
 */
export function overviewTopDriverLine(model: BurnoutViewModel): string {
  const first = model.topDrivers[0];
  if (first) return first;
  const sorted = [...model.dimensions].sort((a, b) => b.score - a.score);
  const d = sorted[0];
  if (!d || d.score < 28) {
    return "No single standout driver—strain looks spread across a few areas.";
  }
  if (d.id === "overload") {
    return "Pressure and mental load lead this snapshot.";
  }
  if (d.id === "depletion") {
    return "Energy and reserves are the main drag right now.";
  }
  if (d.id === "recovery") {
    return "Sleep and recovery rhythm are carrying the most strain.";
  }
  return "Focus and day-to-day follow-through need the most support.";
}

/** Short context block for Overview “What helps now” (check-in snapshot only; plan progress is visualized in UI). */
export type OverviewWhatHelpsContext = {
  /** Quick strain read from the same inputs as the ring (band + composite). */
  strainMetaLine: string;
  checkinEyebrow: string;
  /** Second-line emphasis, e.g. “What we got”. */
  checkinHighlight: string;
  primaryDriver: string;
  supportingDriver: string | null;
  /** One line tying snapshot shape to answers (when it adds beyond primary). */
  snapshotSummaryLine: string | null;
};

/**
 * Plain-language drivers from the latest check-in for What helps now.
 */
export function overviewWhatHelpsContext(
  model: BurnoutViewModel,
  plans: StoredPlan[],
): OverviewWhatHelpsContext {
  void plans;

  let primary =
    model.needsAttention[0]?.trim() ?? overviewTopDriverLine(model);
  if (primary.length > 130) {
    primary = `${primary.slice(0, 127)}…`;
  }

  let supporting: string | null = null;
  if (model.needsAttention.length > 1) {
    const s = model.needsAttention[1].trim();
    if (s && s !== primary) {
      supporting = s.length > 110 ? `${s.slice(0, 107)}…` : s;
    }
  } else if (model.overallTrendHint && model.previousComposite != null) {
    supporting = model.overallTrendHint;
  }

  const sum = model.summaryLine.trim();
  let snapshotSummaryLine: string | null = null;
  if (sum.length > 0) {
    const primaryChunk = primary.slice(0, 28).toLowerCase();
    const sumLower = sum.toLowerCase();
    const tooSimilar =
      sumLower.includes(primaryChunk) || primaryLowerIncludesSum(primaryChunk, sumLower);
    if (!tooSimilar && sum.length > 24) {
      snapshotSummaryLine = sum.length > 140 ? `${sum.slice(0, 137)}…` : sum;
    }
  }

  const strainMetaLine = `${model.bandLabel} overall • ${model.composite}/100 strain`;

  return {
    strainMetaLine,
    checkinEyebrow: "From your check-in and saved plans",
    checkinHighlight: "Check-in & your tasks",
    primaryDriver: primary,
    supportingDriver: supporting,
    snapshotSummaryLine,
  };
}

function primaryLowerIncludesSum(primaryChunk: string, sumLower: string): boolean {
  if (primaryChunk.length < 8) return false;
  return primaryChunk.split(/\s+/).some(
    (w) => w.length > 5 && sumLower.includes(w),
  );
}

export type OverviewNextMoveKind = "chat" | "plan" | "burnout" | "retake";

export type OverviewNextMove = {
  headline: string;
  detail: string;
  actionLabel: string;
  kind: OverviewNextMoveKind;
};

const STALE_CHECKIN_DAYS = 14;

function daysSinceCheckin(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}

export function overviewActionLabel(kind: OverviewNextMoveKind): string {
  if (kind === "chat") return "Open Support Chat";
  if (kind === "plan") return "Open Plan";
  if (kind === "burnout") return "Open Burnout";
  return "Retake check-in";
}

export function overviewChatReason(model: BurnoutViewModel): string {
  const moderateHigh =
    model.band === "moderate" ||
    model.band === "high" ||
    model.composite >= 52;
  return moderateHigh
    ? "Need to vent, rant, or brainstorm? Talk it through before you add more pressure."
    : "A calm place to think out loud—rant, brainstorm, or sort what’s stuck.";
}

export type OverviewServiceRec = {
  id: OverviewNextMoveKind;
  /** Short product-facing service name */
  title: string;
  /** One line, non-clinical */
  reason: string;
};

/** Titles + reasons for plan tiles (Overview “What helps now”). */
function planServiceCopy(
  hasChecklist: boolean,
  planIncomplete: boolean,
): { title: string; reason: string } {
  if (planIncomplete) {
    return {
      title: "Tailored plan · pending tasks",
      reason:
        "Refine open steps against your check-in so load doesn’t harden into burnout.",
    };
  }
  if (!hasChecklist) {
    return {
      title: "Make a tailored plan",
      reason:
        "Shape steps from what you logged—target strain early and ease burnout risk.",
    };
  }
  return {
    title: "Tailor your next plan pass",
    reason:
      "Refresh or extend your list so it still matches today’s strain—keeps burnout from sneaking back.",
  };
}

/**
 * Up to three ranked service hints for Overview “What helps now”.
 * Prioritizes Plan + Support chat; New check-in only when clearly useful (e.g. stale snapshot).
 */
export function overviewBestServices(
  model: BurnoutViewModel,
  plans: StoredPlan[],
  latestCheckinCreatedAt?: string | null,
): OverviewServiceRec[] {
  const out: OverviewServiceRec[] = [];
  const seen = new Set<OverviewNextMoveKind>();

  const add = (
    kind: OverviewNextMoveKind,
    title: string,
    reason: string,
  ) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    out.push({ id: kind, title, reason });
  };

  const items = plans[0]?.checklist_items ?? [];
  const prog = planChecklistProgress(items);
  const hasChecklist = items.length > 0;
  const planIncomplete = hasChecklist && prog.completed < prog.total;
  const meaningfulStrain = model.composite >= 38;

  const sortedDims = [...model.dimensions].sort((a, b) => b.score - a.score);
  const lead = sortedDims[0];
  const recoveryOrDepletionLead =
    lead != null &&
    (lead.id === "recovery" || lead.id === "depletion") &&
    lead.score >= 40;

  const age = daysSinceCheckin(latestCheckinCreatedAt);
  const stale = age != null && age >= STALE_CHECKIN_DAYS;

  const suggestBurnout =
    model.overallStrainTrend === "worsening" || model.composite >= 48;

  // Case D: stale snapshot and no incomplete plan — refresh first, then core services.
  if (stale && !planIncomplete) {
    add(
      "retake",
      "New check-in",
      "Refresh so guidance matches how things are now.",
    );
    add("chat", "Support chat", overviewChatReason(model));
    const dCopy = planServiceCopy(hasChecklist, false);
    add("plan", dCopy.title, dCopy.reason);
    return out.slice(0, 3);
  }

  // Case A: incomplete plan — Plan first, chat second.
  if (planIncomplete) {
    const pCopy = planServiceCopy(hasChecklist, true);
    add("plan", pCopy.title, pCopy.reason);
    add("chat", "Support chat", overviewChatReason(model));
    if (suggestBurnout && !seen.has("burnout")) {
      add("burnout", "Burnout view", "See the full burnout picture and trends.");
    } else if (stale && !seen.has("retake")) {
      add(
        "retake",
        "New check-in",
        "It's been a while—update when you have a minute.",
      );
    } else if (!seen.has("burnout") && model.composite >= 40) {
      add("burnout", "Burnout view", "See the full burnout picture and trends.");
    }
    return out.slice(0, 3);
  }

  // Case C: recovery or depletion leading — chat first, then plan.
  if (recoveryOrDepletionLead && model.composite >= 36) {
    add("chat", "Support chat", overviewChatReason(model));
    const cCopy = planServiceCopy(hasChecklist, planIncomplete);
    add("plan", cCopy.title, cCopy.reason);
    add("burnout", "Burnout view", "See the full burnout picture and trends.");
    return out.slice(0, 3);
  }

  // Case B: no checklist + meaningful strain — make a plan first.
  if (!hasChecklist && meaningfulStrain) {
    const bCopy = planServiceCopy(false, false);
    add("plan", bCopy.title, bCopy.reason);
    add("chat", "Support chat", overviewChatReason(model));
    add("burnout", "Burnout view", "See the full burnout picture and trends.");
    return out.slice(0, 3);
  }

  // Default: surface plan + chat; retake only as a weak-history hint, not as primary.
  const pCopy = planServiceCopy(hasChecklist, planIncomplete);
  add("plan", pCopy.title, pCopy.reason);
  add("chat", "Support chat", overviewChatReason(model));
  if (suggestBurnout && !seen.has("burnout")) {
    add("burnout", "Burnout view", "See the full burnout picture and trends.");
  } else if (
    out.length < 3 &&
    model.previousComposite === null &&
    model.band === "low" &&
    model.composite < 34
  ) {
    add(
      "retake",
      "New check-in",
      "A fresh check-in helps when there's little history yet.",
    );
  } else if (!seen.has("burnout") && model.composite >= 42) {
    add("burnout", "Burnout view", "See the full burnout picture and trends.");
  }

  return out.slice(0, 3);
}

/**
 * Deterministic “what next” for dashboard Overview (not AI).
 * Mirrors the first item from {@link overviewBestServices}.
 */
export function pickOverviewNextMove(
  model: BurnoutViewModel,
  plans: StoredPlan[],
  latestCheckinCreatedAt?: string | null,
): OverviewNextMove {
  const recs = overviewBestServices(model, plans, latestCheckinCreatedAt);
  const first = recs[0];
  if (first) {
    return {
      kind: first.id,
      headline: first.title,
      detail: first.reason,
      actionLabel: overviewActionLabel(first.id),
    };
  }
  return {
    kind: "chat",
    headline: "Support chat",
    detail: overviewChatReason(model),
    actionLabel: overviewActionLabel("chat"),
  };
}

/**
 * Rule-based burnout snapshot for a single check-in (same math as the full view model).
 * Pass plan checklist only when that snapshot should include follow-through strain (e.g. latest).
 */
export function burnoutSnapshotForCheckin(
  checkin: CheckinDetailResponse,
  latestPlanChecklist?: PlanChecklistItem[] | null,
): BurnoutSnapshot {
  return computeBurnoutSnapshot(checkin, latestPlanChecklist ?? null);
}

/** For tests or callers that already have history newest-first */
export function previousCheckinFromHistory(
  history: CheckinHistoryItem[],
  latestId: string,
): CheckinDetailResponse | null {
  const older = history.find((row) => row.id !== latestId);
  return older ?? null;
}
