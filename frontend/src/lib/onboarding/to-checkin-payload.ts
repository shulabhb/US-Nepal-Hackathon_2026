import type { CheckinCreatePayload, RecommendationSnapshot } from "@/types/api";

import type { OnboardingPersistedState } from "@/lib/onboarding/storage";
import { isOnboardingComplete } from "@/lib/onboarding/storage";

export type { CheckinCreatePayload } from "@/types/api";

export function toCheckinPayload(
  state: OnboardingPersistedState,
  anonymousId: string,
  options?: {
    recommendationSnapshot?: RecommendationSnapshot;
    clientContext?: Record<string, unknown>;
  },
): CheckinCreatePayload {
  if (!isOnboardingComplete(state)) {
    throw new Error("Cannot build check-in payload: onboarding is incomplete.");
  }
  const { step1, step2, step3, step4, step5 } = state;
  if (!step1 || !step2 || !step3 || !step4 || !step5) {
    throw new Error("Cannot build check-in payload: missing steps.");
  }

  const core: Omit<
    CheckinCreatePayload,
    "raw_payload" | "recommendation_snapshot" | "client_context"
  > = {
    anonymous_id: anonymousId,
    step1: {
      roles: [...step1.roles],
      role_other_text: step1.role_other_text ?? null,
      pressures: [...step1.pressures],
      pressure_other_text: step1.pressure_other_text ?? null,
      help_needs: [...step1.help_needs],
      help_other_text: step1.help_other_text ?? null,
    },
    step2: {
      symptoms: [...step2.symptoms],
      stress_level: step2.stressLevel,
      energy_level: step2.energyLevel,
    },
    step3: {
      sleep_duration: step3.duration,
      sleep_quality: step3.quality,
      sleep_consistency: step3.consistency,
      imported_from_wearable: step3.importedFromWearable,
    },
    step4: {
      country_of_birth: step4.country_of_birth ?? null,
      has_migration_history: step4.has_migration_history ?? null,
      migration_entries: step4.migration_entries.map((e) => ({
        country: e.country,
        adjustment_impact: e.adjustment_impact,
      })),
      migration_context: step4.migration_context ?? null,
    },
    step5: {
      medications: step5.medications ?? null,
      medical_conditions: step5.medical_conditions ?? null,
      additional_context: step5.additional_context ?? null,
      consent_to_sensitive_context:
        step5.consent_to_sensitive_context ?? null,
    },
  };

  const raw_payload: Record<string, unknown> = {
    anonymous_id: anonymousId,
    step1: core.step1,
    step2: core.step2,
    step3: core.step3,
    step4: core.step4,
    step5: core.step5,
    /** Convenience for queries that expect singular primary keys. */
    primary: {
      role: step1.roles[0] ?? null,
      pressure: step1.pressures[0] ?? null,
      help_need: step1.help_needs[0] ?? null,
    },
    saved_at: new Date().toISOString(),
    source: {
      app: "burnout-radar-web",
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
    },
  };

  return {
    ...core,
    raw_payload,
    recommendation_snapshot: options?.recommendationSnapshot ?? null,
    client_context: options?.clientContext ?? null,
  };
}

/** Dedupe key: steps + recommendation snapshot (so algorithm/display changes re-sync). */
export function checkinPersistFingerprint(
  state: OnboardingPersistedState,
  snapshot: RecommendationSnapshot,
): string {
  return JSON.stringify({
    step1: state.step1,
    step2: state.step2,
    step3: state.step3,
    step4: state.step4,
    step5: state.step5,
    snapshot,
  });
}

/** @deprecated for persistence — use checkinPersistFingerprint with snapshot. */
export function onboardingStepsFingerprint(
  state: OnboardingPersistedState,
): string {
  return JSON.stringify({
    step1: state.step1,
    step2: state.step2,
    step3: state.step3,
    step4: state.step4,
    step5: state.step5,
  });
}
