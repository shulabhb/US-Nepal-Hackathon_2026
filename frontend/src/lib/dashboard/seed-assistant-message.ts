import type { CheckinDetailResponse } from "@/types/api";

import { labelForStoredGoal } from "./stored-labels";

function snapshotSummary(snapshot: Record<string, unknown> | null | undefined): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const s = snapshot.summary;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

/** Natural “help with …” phrase for the first chat line (matches onboarding goal labels). */
function goalHelpPhrase(goalKey: string): string {
  const label = labelForStoredGoal(goalKey).toLowerCase();
  const map: Record<string, string> = {
    "sleep better": "sleeping better",
    "feel less overwhelmed": "feeling less overwhelmed",
    "focus better": "focusing better",
    "manage burnout": "managing burnout",
    "get a plan": "getting a plan",
    "talk to someone safely": "finding someone safe to talk to",
    "improve routine": "improving your routine",
    "calm down right now": "calming down in the moment",
  };
  return map[label] ?? label;
}

/**
 * First assistant turn: goal-focused + one line from saved recommendation summary when available.
 */
export function buildSeededAssistantMessage(
  checkin: CheckinDetailResponse,
): string {
  const helpWith = goalHelpPhrase(checkin.goal);
  const summary =
    snapshotSummary(checkin.recommendation_snapshot) ??
    "Your latest check-in is on file—we can pick one gentle next step when you’re ready.";

  return `You said you want help with ${helpWith}. Based on your latest check-in, ${summary} What would help most right now?`;
}
