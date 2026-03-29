import { saveCheckin } from "@/lib/api/checkins";
import { getOrCreateAnonymousId } from "@/lib/onboarding/anonymous-id";
import {
  getCheckinSyncHash,
  getOnboardingResumePath,
  readOnboardingState,
  setCheckinSyncHash,
} from "@/lib/onboarding/storage";
import {
  checkinPersistFingerprint,
  toCheckinPayload,
} from "@/lib/onboarding/to-checkin-payload";
import { buildRecommendations } from "@/lib/scoring/recommendation-engine";
import { toRecommendationSnapshot } from "@/lib/scoring/recommendation-snapshot";

export type SyncCheckinFromOnboardingResult =
  | { ok: true; didWrite: boolean }
  | { ok: false; error: string };

/**
 * Saves the completed onboarding session as a check-in when the content changed.
 * Call after `mergeOnboardingState` so storage reflects the latest answers.
 */
export async function syncCheckinFromCompletedOnboarding(): Promise<SyncCheckinFromOnboardingResult> {
  const state = readOnboardingState();
  if (getOnboardingResumePath(state) !== null) {
    return { ok: false, error: "Check-in isn’t finished yet." };
  }

  const rec = buildRecommendations(state);
  if (!rec) {
    return { ok: false, error: "Could not build check-in from this session." };
  }

  const snapshot = toRecommendationSnapshot(rec);
  const fingerprint = checkinPersistFingerprint(state, snapshot);

  if (getCheckinSyncHash() === fingerprint) {
    return { ok: true, didWrite: false };
  }

  try {
    const body = toCheckinPayload(state, getOrCreateAnonymousId(), {
      recommendationSnapshot: snapshot,
    });
    await saveCheckin(body);
    setCheckinSyncHash(fingerprint);
    return { ok: true, didWrite: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not reach the server to save your check-in.",
    };
  }
}
