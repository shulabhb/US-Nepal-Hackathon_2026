import type {
  CheckinDetailResponse,
  GenerateChatReplyRequest,
  GenerateChatReplyResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
} from "@/types/api";

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  return raw.replace(/\/$/, "");
}

function formatErrorBody(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((d) =>
          typeof d === "object" && d && "msg" in d
            ? String((d as { msg: string }).msg)
            : JSON.stringify(d),
        )
        .join("; ");
    }
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
  } catch {
    // use raw text
  }
  return text || `HTTP ${status}`;
}

/**
 * Build a stable JSON object for POST /ai/plan/generate from the latest check-in row.
 */
export function buildPlanCheckinContext(
  checkin: CheckinDetailResponse,
): Record<string, unknown> {
  return {
    checkin_id: checkin.id,
    created_at: checkin.created_at,
    role: checkin.role,
    pressure: checkin.pressure,
    goal: checkin.goal,
    symptoms: [...checkin.symptoms],
    stress_level: checkin.stress_level,
    energy_level: checkin.energy_level,
    sleep_duration: checkin.sleep_duration,
    sleep_quality: checkin.sleep_quality,
    sleep_consistency: checkin.sleep_consistency,
    imported_from_wearable: checkin.imported_from_wearable,
    additional_context: checkin.additional_context ?? null,
    raw_payload: checkin.raw_payload ?? null,
    recommendation_snapshot: checkin.recommendation_snapshot ?? null,
  };
}

/**
 * POST /ai/plan/generate — local model on the backend; throws on failure.
 */
export async function generatePlan(
  payload: GeneratePlanRequest,
): Promise<GeneratePlanResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const res = await fetch(`${base}/ai/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as GeneratePlanResponse;
  } catch {
    throw new Error("Server returned invalid JSON for plan generation.");
  }
}

/**
 * POST /ai/chat/reply — local model; server may return fallback text if the model is down.
 */
export async function generateChatReply(
  payload: GenerateChatReplyRequest,
): Promise<GenerateChatReplyResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const res = await fetch(`${base}/ai/chat/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as GenerateChatReplyResponse;
  } catch {
    throw new Error("Server returned invalid JSON for chat reply.");
  }
}
