import type { CheckinDetailResponse } from "@/types/api";
import type { WearableSimulationSnapshot } from "@/lib/onboarding/wearable-simulation";

/**
 * Reads demo wearable simulation from a saved check-in (raw_payload.step3).
 * Use this for future Burnout tab charts — no UI component yet.
 */
export function getWearableSimulationFromCheckin(
  checkin: CheckinDetailResponse,
): WearableSimulationSnapshot | null {
  const rp = checkin.raw_payload;
  if (!rp || typeof rp !== "object") return null;
  const step3 = (rp as Record<string, unknown>).step3;
  if (!step3 || typeof step3 !== "object") return null;
  const sim = (step3 as Record<string, unknown>).wearable_simulation;
  if (!sim || typeof sim !== "object") return null;
  return sim as WearableSimulationSnapshot;
}
