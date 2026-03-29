import type {
  CheckinCreatePayload,
  CheckinDetailResponse,
  CheckinHistoryItem,
} from "@/types/api";

export type CheckinSaveResponse = {
  anonymous_id: string;
  checkin_id?: string | null;
  status: string;
  message: string;
};

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
 * POST full check-in to FastAPI. Throws on network or non-2xx response.
 */
export async function saveCheckin(
  payload: CheckinCreatePayload,
): Promise<CheckinSaveResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.local.example).",
    );
  }

  const res = await fetch(`${base}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatErrorBody(res.status, text));
  }

  return (await res.json()) as CheckinSaveResponse;
}

/**
 * GET latest full check-in for this opaque client id. Throws on network or non-2xx.
 */
export async function getLatestCheckin(
  anonymousId: string,
): Promise<CheckinDetailResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.local.example).",
    );
  }

  const enc = encodeURIComponent(anonymousId);
  const res = await fetch(`${base}/checkins/${enc}`, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatErrorBody(res.status, text));
  }

  return (await res.json()) as CheckinDetailResponse;
}

/**
 * GET latest check-in, or null if none saved (404). Throws on other errors.
 */
export async function getLatestCheckinMaybe(
  anonymousId: string,
): Promise<CheckinDetailResponse | null> {
  const base = apiBase();
  if (!base) {
    return null;
  }

  const enc = encodeURIComponent(anonymousId);
  const res = await fetch(`${base}/checkins/${enc}`, { method: "GET" });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatErrorBody(res.status, text));
  }

  return (await res.json()) as CheckinDetailResponse;
}

/**
 * GET recent check-ins (newest first, max 5). Returns [] if none saved.
 */
export async function getCheckinHistory(
  anonymousId: string,
): Promise<CheckinHistoryItem[]> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.local.example).",
    );
  }

  const enc = encodeURIComponent(anonymousId);
  const res = await fetch(`${base}/checkins/${enc}/history`, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatErrorBody(res.status, text));
  }

  return (await res.json()) as CheckinHistoryItem[];
}
