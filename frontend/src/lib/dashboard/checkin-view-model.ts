/**
 * Plain interpretation helpers for dashboard check-in display.
 * Rule-based only — not clinical and not AI.
 */

import type { CheckinDetailResponse } from "@/types/api";
import type { SleepDurationBucket } from "@/lib/onboarding/step-three";
import {
  CONSISTENCY_OPTIONS,
  DURATION_OPTIONS,
  QUALITY_OPTIONS,
} from "@/lib/onboarding/step-three";
import { SYMPTOM_OPTIONS } from "@/lib/onboarding/step-two";

import {
  labelForStoredGoal,
  labelForStoredPressure,
  labelForStoredRole,
} from "./stored-labels";

export type SignalTone = "settled" | "neutral" | "watch";

export type SignalCardModel = {
  title: string;
  value: string;
  status: string;
  hint: string;
  tone: SignalTone;
};

export type ParsedMigrationEntry = {
  country: string;
  adjustment_impact: number;
};

export type ParsedMigration = {
  country_of_birth: string | null;
  has_migration_history: boolean | null;
  migration_entries: ParsedMigrationEntry[];
  migration_context: string | null;
};

export type ParsedSensitive = {
  medications: string | null;
  medical_conditions: string | null;
  additional_context: string | null;
  consent_to_sensitive_context: boolean | null;
};

export type ParsedIntake = {
  roles: string[];
  role_other_text: string | null;
  pressures: string[];
  pressure_other_text: string | null;
  help_needs: string[];
  help_other_text: string | null;
  /** Personal narrative (new: step5; legacy: step4 only). */
  additional_context: string | null;
  migration: ParsedMigration | null;
  sensitive: ParsedSensitive | null;
};

/** @deprecated use ParsedMigration */
export type ParsedStep5 = ParsedMigration;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function isMigrationRaw(d: Record<string, unknown>): boolean {
  return (
    "migration_entries" in d ||
    "has_migration_history" in d ||
    "country_of_birth" in d ||
    "migration_context" in d
  );
}

function legacyStep4FreetextOnly(d: Record<string, unknown>): boolean {
  return (
    "additional_context" in d &&
    !isMigrationRaw(d) &&
    !("medications" in d) &&
    !("medical_conditions" in d) &&
    !("consent_to_sensitive_context" in d)
  );
}

function parseMigrationFromRaw(s: Record<string, unknown>): ParsedMigration | null {
  const cob =
    typeof s.country_of_birth === "string"
      ? s.country_of_birth.trim() || null
      : null;
  const has =
    typeof s.has_migration_history === "boolean"
      ? s.has_migration_history
      : null;
  const entriesRaw = Array.isArray(s.migration_entries)
    ? s.migration_entries
    : [];
  const migration_entries: ParsedMigrationEntry[] = [];
  for (const e of entriesRaw) {
    const er = asRecord(e);
    if (!er) continue;
    const country = typeof er.country === "string" ? er.country.trim() : "";
    const adj = er.adjustment_impact;
    const n =
      typeof adj === "number" && Number.isFinite(adj) ? adj : Number(adj);
    if (country && n >= 1 && n <= 10) {
      migration_entries.push({ country, adjustment_impact: Math.round(n) });
    }
  }
  const mctx =
    typeof s.migration_context === "string"
      ? s.migration_context.trim() || null
      : null;
  if (
    cob ||
    has !== null ||
    migration_entries.length > 0 ||
    (mctx && mctx.length > 0)
  ) {
    return {
      country_of_birth: cob,
      has_migration_history: has,
      migration_entries,
      migration_context: mctx,
    };
  }
  return null;
}

function parseSensitiveFromRaw(s: Record<string, unknown>): ParsedSensitive | null {
  if (
    isMigrationRaw(s) &&
    !("medications" in s) &&
    !("medical_conditions" in s)
  ) {
    return null;
  }
  const meds =
    "medications" in s
      ? typeof s.medications === "string"
        ? s.medications.trim() || null
        : null
      : null;
  const conds =
    "medical_conditions" in s
      ? typeof s.medical_conditions === "string"
        ? s.medical_conditions.trim() || null
        : null
      : null;
  const add =
    "additional_context" in s
      ? typeof s.additional_context === "string"
        ? s.additional_context.trim() || null
        : null
      : null;
  const consent =
    "consent_to_sensitive_context" in s
      ? typeof s.consent_to_sensitive_context === "boolean"
        ? s.consent_to_sensitive_context
        : null
      : null;

  if (!meds && !conds && !add && consent == null) {
    return null;
  }
  return {
    medications: meds,
    medical_conditions: conds,
    additional_context: add,
    consent_to_sensitive_context: consent,
  };
}

export function parseIntakeFromCheckin(c: CheckinDetailResponse): ParsedIntake {
  const empty: ParsedIntake = {
    roles: [],
    role_other_text: null,
    pressures: [],
    pressure_other_text: null,
    help_needs: [],
    help_other_text: null,
    additional_context: null,
    migration: null,
    sensitive: null,
  };

  const rp = asRecord(c.raw_payload);
  if (!rp) {
    return {
      ...empty,
      roles: c.role ? [c.role] : [],
      pressures: c.pressure ? [c.pressure] : [],
      help_needs: c.goal ? [c.goal] : [],
      additional_context: c.additional_context ?? null,
    };
  }

  const s1 = asRecord(rp.step1);
  const roles = s1 && Array.isArray(s1.roles) ? s1.roles.map(String) : [];
  const pressures =
    s1 && Array.isArray(s1.pressures) ? s1.pressures.map(String) : [];
  const help_needs =
    s1 && Array.isArray(s1.help_needs) ? s1.help_needs.map(String) : [];
  const role_other =
    s1 && s1.role_other_text != null && String(s1.role_other_text).trim()
      ? String(s1.role_other_text).trim()
      : null;
  const pressure_other =
    s1 &&
    s1.pressure_other_text != null &&
    String(s1.pressure_other_text).trim()
      ? String(s1.pressure_other_text).trim()
      : null;
  const help_other =
    s1 && s1.help_other_text != null && String(s1.help_other_text).trim()
      ? String(s1.help_other_text).trim()
      : null;

  const s4 = asRecord(rp.step4);
  const s5 = asRecord(rp.step5);

  let migration: ParsedMigration | null = null;
  if (s4 && isMigrationRaw(s4)) {
    migration = parseMigrationFromRaw(s4);
  } else if (s5 && isMigrationRaw(s5)) {
    migration = parseMigrationFromRaw(s5);
  }

  let sensitive: ParsedSensitive | null = null;
  if (s5) {
    sensitive = parseSensitiveFromRaw(s5);
  }

  let additional: string | null = sensitive?.additional_context ?? null;
  if (additional == null && s4 && legacyStep4FreetextOnly(s4)) {
    const rawAc = s4.additional_context;
    if (typeof rawAc === "string") {
      const t = rawAc.trim();
      if (t) additional = t;
    }
  }
  if (additional == null && c.additional_context?.trim()) {
    additional = c.additional_context.trim();
  }

  const useRoles = roles.length ? roles : c.role ? [c.role] : [];
  const usePressures = pressures.length
    ? pressures
    : c.pressure
      ? [c.pressure]
      : [];
  const useHelp = help_needs.length ? help_needs : c.goal ? [c.goal] : [];

  return {
    roles: useRoles,
    role_other_text: role_other,
    pressures: usePressures,
    pressure_other_text: pressure_other,
    help_needs: useHelp,
    help_other_text: help_other,
    additional_context: additional,
    migration,
    sensitive,
  };
}

export function labelSleepDuration(value: string): string {
  const hit = DURATION_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? value.replace(/_/g, " ");
}

export function labelSleepQuality(value: string): string {
  const hit = QUALITY_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? value.replace(/_/g, " ");
}

export function labelSleepConsistency(value: string): string {
  const hit = CONSISTENCY_OPTIONS.find((o) => o.value === value);
  return hit?.label ?? value.replace(/_/g, " ");
}

export function labelSymptom(id: string): string {
  const hit = SYMPTOM_OPTIONS.find((o) => o.value === id);
  return hit?.label ?? id.replace(/_/g, " ");
}

function durationTier(
  bucket: string,
): { status: string; hint: string; tone: SignalTone } {
  const map: Partial<
    Record<
      SleepDurationBucket,
      { status: string; hint: string; tone: SignalTone }
    >
  > = {
    lt_5: {
      status: "Very short",
      hint: "Nights are quite short—recovery may feel tighter.",
      tone: "watch",
    },
    h_5_6: {
      status: "Short",
      hint: "On the shorter side for many adults.",
      tone: "neutral",
    },
    h_6_7: {
      status: "Moderate",
      hint: "Near a middle range for a lot of people.",
      tone: "neutral",
    },
    h_7_8: {
      status: "Ideal range",
      hint: "In a range many people aim for.",
      tone: "settled",
    },
    gt_8: {
      status: "Long",
      hint: "Plenty of time in bed—worth noticing if rest feels restorative.",
      tone: "neutral",
    },
  };
  const hit = map[bucket as SleepDurationBucket];
  if (hit) return hit;
  return {
    status: labelSleepDuration(bucket),
    hint: "How nights feel matters as much as the hours on paper.",
    tone: "neutral",
  };
}

function qualitySignal(
  q: string,
): { status: string; hint: string; tone: SignalTone } {
  if (q === "good") {
    return {
      status: "Good",
      hint: "A supportive sign for bouncing back.",
      tone: "settled",
    };
  }
  if (q === "okay") {
    return {
      status: "Okay",
      hint: "Middle ground—small upgrades can still help.",
      tone: "neutral",
    };
  }
  if (q === "poor") {
    return {
      status: "Poor",
      hint: "Recovery may feel uneven right now.",
      tone: "watch",
    };
  }
  return {
    status: labelSleepQuality(q),
    hint: "Quality shapes how rested you feel, not just hours.",
    tone: "neutral",
  };
}

function consistencySignal(
  c: string,
): { status: string; hint: string; tone: SignalTone } {
  if (c === "consistent") {
    return {
      status: "Consistent",
      hint: "Timing looks steadier—often easier on the body.",
      tone: "settled",
    };
  }
  if (c === "somewhat_consistent") {
    return {
      status: "Somewhat consistent",
      hint: "Some variation night to night.",
      tone: "neutral",
    };
  }
  if (c === "very_inconsistent") {
    return {
      status: "Inconsistent",
      hint: "Nights jump around—rhythm may feel harder to trust.",
      tone: "watch",
    };
  }
  return {
    status: labelSleepConsistency(c),
    hint: "Regular bed and wake times can ease the load on your system.",
    tone: "neutral",
  };
}

function stressSignal(
  n: number,
): { status: string; hint: string; tone: SignalTone } {
  if (n <= 4) {
    return {
      status: "Lower",
      hint: "A calmer read in this snapshot—still worth guarding recovery.",
      tone: "settled",
    };
  }
  if (n <= 7) {
    return {
      status: "Moderate",
      hint: "Strain is present—small resets can keep it from stacking.",
      tone: "neutral",
    };
  }
  return {
    status: "High",
    hint: "Pressure reads elevated—gentle pacing matters.",
    tone: "watch",
  };
}

function energySignal(
  n: number,
): { status: string; hint: string; tone: SignalTone } {
  if (n <= 3) {
    return {
      status: "Very low",
      hint: "Reserves look thin—basics like sleep and meals count double.",
      tone: "watch",
    };
  }
  if (n <= 6) {
    return {
      status: "Reduced",
      hint: "Energy isn’t fully back—leave margin where you can.",
      tone: "neutral",
    };
  }
  return {
    status: "Stronger",
    hint: "A bit more fuel than on heavier days—still no need to overfill the plate.",
    tone: "settled",
  };
}

export function buildSignalCards(c: CheckinDetailResponse): SignalCardModel[] {
  const stress = stressSignal(c.stress_level);
  const energy = energySignal(c.energy_level);
  const dur = durationTier(c.sleep_duration);
  const qual = qualitySignal(c.sleep_quality);
  const cons = consistencySignal(c.sleep_consistency);

  return [
    {
      title: "Stress",
      value: `${c.stress_level} / 10`,
      status: stress.status,
      hint: stress.hint,
      tone: stress.tone,
    },
    {
      title: "Energy",
      value: `${c.energy_level} / 10`,
      status: energy.status,
      hint: energy.hint,
      tone: energy.tone,
    },
    {
      title: "Sleep · duration",
      value: labelSleepDuration(c.sleep_duration),
      status: dur.status,
      hint: dur.hint,
      tone: dur.tone,
    },
    {
      title: "Sleep · quality",
      value: labelSleepQuality(c.sleep_quality),
      status: qual.status,
      hint: qual.hint,
      tone: qual.tone,
    },
    {
      title: "Sleep · consistency",
      value: labelSleepConsistency(c.sleep_consistency),
      status: cons.status,
      hint: cons.hint,
      tone: cons.tone,
    },
  ];
}

export function riskLabelFromSnapshot(c: CheckinDetailResponse): string | null {
  const s = c.recommendation_snapshot;
  if (s && typeof s === "object" && typeof s.risk_label === "string") {
    const t = s.risk_label.trim();
    return t || null;
  }
  return null;
}

export function summaryFromSnapshot(c: CheckinDetailResponse): string | null {
  const s = c.recommendation_snapshot;
  if (s && typeof s === "object" && typeof s.summary === "string") {
    const t = s.summary.trim();
    return t || null;
  }
  return null;
}

/** One-line summary for compact history cards (truncated). */
export function historyCardSummaryLine(
  c: CheckinDetailResponse,
  maxLen = 130,
): string {
  const s = summaryFromSnapshot(c);
  if (s) {
    const t = s.trim();
    if (t.length <= maxLen) return t;
    return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
  }
  const fb = buildFallbackSnapshotLine(c);
  if (fb.length <= maxLen) return fb;
  return `${fb.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** Short, honest line when we don’t have a saved recommendation summary. */
export function buildFallbackSnapshotLine(c: CheckinDetailResponse): string {
  const parts: string[] = [];
  if (c.stress_level <= 4) parts.push("stress looks lower right now");
  else if (c.stress_level >= 8) parts.push("stress looks elevated");

  if (c.energy_level <= 3) parts.push("energy still looks low");
  else if (c.energy_level >= 7) parts.push("energy looks somewhat stronger");

  const sleepDrag =
    c.sleep_quality === "poor" ||
    c.sleep_consistency === "very_inconsistent" ||
    c.sleep_duration === "lt_5" ||
    c.sleep_duration === "h_5_6";
  if (sleepDrag) parts.push("sleep and recovery may want a little attention");

  if (parts.length === 0) {
    return "Signals are mixed in this snapshot—skim the cards below for what stood out.";
  }
  return `${parts.slice(0, 2).join("; ")}—based only on what you saved here, not a full picture.`;
}

export function adjustmentFeelLabel(n: number): string {
  if (n <= 3) return "Adjusted fairly easily";
  if (n <= 6) return "Mixed adjustment";
  return "Felt more out of place";
}

export function buildOkayAndAttention(
  c: CheckinDetailResponse,
  intake: ParsedIntake,
): { okay: string[]; attention: string[] } {
  const okay: string[] = [];
  const attention: string[] = [];

  if (c.stress_level <= 5) {
    okay.push("Stress isn’t reading at the very top of the scale here.");
  }
  if (c.stress_level >= 8) {
    attention.push("Stress is running high—worth pacing and asking for help early if you need it.");
  }

  if (c.energy_level >= 6) {
    okay.push("Energy isn’t in the lowest band—you may still feel tired, but there’s a little room.");
  }
  if (c.energy_level <= 3) {
    attention.push("Energy looks very low—protecting sleep and meals can matter more than usual.");
  }

  if (c.sleep_quality === "good") {
    okay.push("Sleep quality reads on the positive side.");
  }
  if (c.sleep_quality === "poor") {
    attention.push("Sleep quality is rougher in this snapshot.");
  }

  if (c.sleep_consistency === "consistent") {
    okay.push("Sleep timing looks fairly steady.");
  }
  if (c.sleep_consistency === "very_inconsistent") {
    attention.push("Sleep rhythm shifts a lot from night to night.");
  }

  if (c.sleep_duration === "h_7_8" || c.sleep_duration === "gt_8") {
    okay.push("Time in bed isn’t extremely short on paper.");
  }
  if (c.sleep_duration === "lt_5") {
    attention.push("Nights look very short on duration.");
  }

  if (intake.pressures.length >= 3) {
    attention.push("Several pressure areas were selected—it’s a lot to hold at once.");
  } else if (intake.pressures.length === 1 && c.stress_level <= 6) {
    okay.push("You named a clearer pressure focus rather than a long scattered list.");
  }

  if (c.symptoms.length >= 5) {
    attention.push("Quite a few day-to-day symptoms showed up—worth treating that as real load, not noise.");
  }

  return { okay, attention };
}

export function chipLabelForRoleId(id: string): string {
  return labelForStoredRole(id);
}

export function chipLabelForPressureId(id: string): string {
  return labelForStoredPressure(id);
}

export function chipLabelForHelpId(id: string): string {
  return labelForStoredGoal(id);
}
