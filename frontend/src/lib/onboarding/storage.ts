import type { OnboardingStep1Data } from "./step-one";
import type { OnboardingStep4 } from "./step-four";
import type { OnboardingStep5 } from "./step-five";
import type { OnboardingStep3 } from "./step-three";
import type { OnboardingStep2 } from "./step-two";

const STORAGE_KEY = "burnout-radar-onboarding-v1";
/** Same-device dedupe: last successfully synced onboarding payload fingerprint. */
const CHECKIN_SYNC_HASH_KEY = "burnout-radar-checkin-sync-hash";

export type OnboardingPersistedState = {
  step1: OnboardingStep1Data | null;
  step2: OnboardingStep2 | null;
  step3: OnboardingStep3 | null;
  step4: OnboardingStep4 | null;
  step5: OnboardingStep5 | null;
  /**
   * Pre-v2: user had only free-text on old step 4 and had not started migration.
   * Stashed until they complete new step 4 + 5.
   */
  _pending_sensitive_additional?: string | null;
  /**
   * User acknowledged the step-5 disclaimer and may fill optional sensitive fields.
   * When step5 is still null, resume on `/onboarding/step-5/questions`.
   */
  _sensitive_step_questions?: boolean | null;
};

function asObj(
  v: unknown,
): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function isLegacyFreeTextStep4(o: Record<string, unknown>): boolean {
  return (
    "additional_context" in o &&
    !("migration_entries" in o) &&
    !("has_migration_history" in o) &&
    !("country_of_birth" in o) &&
    !("migration_context" in o) &&
    !("medications" in o) &&
    !("medical_conditions" in o) &&
    !("consent_to_sensitive_context" in o)
  );
}

function isMigrationShape(o: Record<string, unknown>): boolean {
  return (
    "migration_entries" in o ||
    "has_migration_history" in o ||
    "country_of_birth" in o ||
    "migration_context" in o
  );
}

function isSensitiveShape(o: Record<string, unknown>): boolean {
  if (isMigrationShape(o) && !("medications" in o) && !("medical_conditions" in o))
    return false;
  if (
    "medications" in o ||
    "medical_conditions" in o ||
    "consent_to_sensitive_context" in o ||
    ("additional_context" in o && !isLegacyFreeTextStep4(o) && !isMigrationShape(o))
  ) {
    return true;
  }
  if (
    "additional_context" in o &&
    !isMigrationShape(o) &&
    typeof o.additional_context === "string" &&
    o.additional_context.trim().length > 0
  ) {
    return true;
  }
  return false;
}

function parseMigration(o: Record<string, unknown>): OnboardingStep4 {
  const entriesRaw = Array.isArray(o.migration_entries)
    ? o.migration_entries
    : [];
  const migration_entries: OnboardingStep4["migration_entries"] = [];
  for (const e of entriesRaw) {
    const er = asObj(e);
    if (!er) continue;
    const country = typeof er.country === "string" ? er.country.trim() : "";
    const adj = er.adjustment_impact;
    const n =
      typeof adj === "number" && Number.isFinite(adj) ? adj : Number(adj);
    if (country && n >= 1 && n <= 10) {
      migration_entries.push({
        country,
        adjustment_impact: Math.round(n),
      });
    }
  }
  const cob =
    typeof o.country_of_birth === "string"
      ? o.country_of_birth.trim() || null
      : null;
  const has =
    typeof o.has_migration_history === "boolean"
      ? o.has_migration_history
      : null;
  const mctx =
    typeof o.migration_context === "string"
      ? o.migration_context.trim() || null
      : null;
  return {
    country_of_birth: cob,
    has_migration_history: has,
    migration_entries,
    migration_context: mctx,
  };
}

function parseSensitive(o: Record<string, unknown>): OnboardingStep5 {
  const meds =
    typeof o.medications === "string" ? o.medications.trim() || null : null;
  const conds =
    typeof o.medical_conditions === "string"
      ? o.medical_conditions.trim() || null
      : null;
  const add =
    typeof o.additional_context === "string"
      ? o.additional_context.trim() || null
      : null;
  const consent =
    typeof o.consent_to_sensitive_context === "boolean"
      ? o.consent_to_sensitive_context
      : null;
  return {
    medications: meds,
    medical_conditions: conds,
    additional_context: add,
    consent_to_sensitive_context: consent,
  };
}

function migrateStepsFromRaw(
  raw4: unknown,
  raw5: unknown,
): {
  step4: OnboardingStep4 | null;
  step5: OnboardingStep5 | null;
  pending: string | null;
} {
  const r4 = asObj(raw4);
  const r5 = asObj(raw5);

  let pending: string | null = null;

  if (r4 && isLegacyFreeTextStep4(r4) && r5 && isMigrationShape(r5)) {
    const ac =
      r4.additional_context == null
        ? null
        : String(r4.additional_context).trim() || null;
    return {
      step4: parseMigration(r5),
      step5: {
        medications: null,
        medical_conditions: null,
        additional_context: ac,
        consent_to_sensitive_context: ac ? true : null,
      },
      pending: null,
    };
  }

  if (r4 && isLegacyFreeTextStep4(r4) && !r5) {
    const ac =
      r4.additional_context == null
        ? null
        : String(r4.additional_context).trim() || null;
    return {
      step4: null,
      step5: null,
      pending: ac,
    };
  }

  if (r4 && isMigrationShape(r4)) {
    const s4 = parseMigration(r4);
    let s5: OnboardingStep5 | null = null;
    if (r5 && isSensitiveShape(r5) && !isMigrationShape(r5)) {
      s5 = parseSensitive(r5);
    } else if (r5 && isMigrationShape(r5)) {
      s5 = null;
    } else if (r5) {
      s5 = parseSensitive(r5);
    }
    return { step4: s4, step5: s5, pending: null };
  }

  return {
    step4: null,
    step5: r5 && !isMigrationShape(r5) ? parseSensitive(r5) : null,
    pending: null,
  };
}

function migrateStep1(raw: unknown): OnboardingStep1Data | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    Array.isArray(o.roles) &&
    Array.isArray(o.pressures) &&
    Array.isArray(o.help_needs)
  ) {
    return {
      roles: o.roles.map(String),
      role_other_text:
        o.role_other_text == null ? null : String(o.role_other_text),
      pressures: o.pressures.map(String),
      pressure_other_text:
        o.pressure_other_text == null ? null : String(o.pressure_other_text),
      help_needs: o.help_needs.map(String),
      help_other_text:
        o.help_other_text == null ? null : String(o.help_other_text),
    };
  }
  if (
    typeof o.role === "string" &&
    typeof o.pressure === "string" &&
    typeof o.goal === "string"
  ) {
    return {
      roles: [o.role],
      pressures: [o.pressure],
      help_needs: [o.goal],
    };
  }
  return null;
}

const emptyState = (): OnboardingPersistedState => ({
  step1: null,
  step2: null,
  step3: null,
  step4: null,
  step5: null,
  _pending_sensitive_additional: null,
  _sensitive_step_questions: null,
});

export function readOnboardingState(): OnboardingPersistedState {
  if (typeof window === "undefined") {
    return emptyState();
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<OnboardingPersistedState> & {
      step1?: unknown;
      step4?: unknown;
      step5?: unknown;
    };
    const step1 = parsed.step1 != null ? migrateStep1(parsed.step1) : null;

    const explicitPending = parsed._pending_sensitive_additional;
    const { step4, step5, pending } = migrateStepsFromRaw(
      parsed.step4,
      parsed.step5,
    );

    const mergedPending =
      explicitPending != null && explicitPending !== undefined
        ? explicitPending === ""
          ? null
          : String(explicitPending).trim() || null
        : pending;

    const sq = parsed._sensitive_step_questions;
    const sensitiveQuestions =
      sq === true ? true : sq === false ? false : null;

    return {
      step1,
      step2: parsed.step2 ?? null,
      step3: parsed.step3 ?? null,
      step4,
      step5,
      _pending_sensitive_additional: mergedPending,
      _sensitive_step_questions: sensitiveQuestions,
    };
  } catch {
    return emptyState();
  }
}

export function writeOnboardingState(next: OnboardingPersistedState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function mergeOnboardingState(
  patch: Partial<OnboardingPersistedState>,
): void {
  const prev = readOnboardingState();
  writeOnboardingState({
    step1: patch.step1 !== undefined ? patch.step1 : prev.step1,
    step2: patch.step2 !== undefined ? patch.step2 : prev.step2,
    step3: patch.step3 !== undefined ? patch.step3 : prev.step3,
    step4: patch.step4 !== undefined ? patch.step4 : prev.step4,
    step5: patch.step5 !== undefined ? patch.step5 : prev.step5,
    _pending_sensitive_additional:
      patch._pending_sensitive_additional !== undefined
        ? patch._pending_sensitive_additional
        : prev._pending_sensitive_additional,
    _sensitive_step_questions:
      patch._sensitive_step_questions !== undefined
        ? patch._sensitive_step_questions
        : prev._sensitive_step_questions,
  });
}

export function isOnboardingComplete(
  state: OnboardingPersistedState,
): boolean {
  return !!(
    state.step1 &&
    state.step2 &&
    state.step3 &&
    state.step4 !== null &&
    state.step4 !== undefined &&
    state.step5 !== null &&
    state.step5 !== undefined
  );
}

/** First onboarding route the user still needs, or null if complete. */
export function getOnboardingResumePath(
  state: OnboardingPersistedState,
): string | null {
  if (!state.step1) return "/onboarding";
  if (!state.step2) return "/onboarding/step-2";
  if (!state.step3) return "/onboarding/step-3";
  if (state.step4 === null || state.step4 === undefined) {
    return "/onboarding/step-4";
  }
  if (state.step5 === null || state.step5 === undefined) {
    if (state._sensitive_step_questions === true) {
      return "/onboarding/step-5/questions";
    }
    return "/onboarding/step-5";
  }
  return null;
}

export function clearOnboardingState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CHECKIN_SYNC_HASH_KEY);
}

export function getCheckinSyncHash(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CHECKIN_SYNC_HASH_KEY);
}

export function setCheckinSyncHash(hash: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKIN_SYNC_HASH_KEY, hash);
}
