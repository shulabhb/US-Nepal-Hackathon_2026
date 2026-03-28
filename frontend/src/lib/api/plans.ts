import type {
  DeletePlanResponse,
  PlanChecklistItem,
  SavePlanRequest,
  SavePlanResponse,
  StoredPlan,
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
 * POST /plans — persist a generated plan.
 */
export async function savePlan(
  payload: SavePlanRequest,
): Promise<SavePlanResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const res = await fetch(`${base}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anonymous_id: payload.anonymous_id,
      source_checkin_id: payload.source_checkin_id ?? null,
      plan: payload.plan,
      model: payload.model ?? null,
      source: payload.source ?? "local_model",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as SavePlanResponse;
  } catch {
    throw new Error("Server returned invalid JSON for save plan.");
  }
}

/**
 * GET /plans/{anonymous_id} — recent saved plans, newest first.
 */
export async function getPlans(anonymousId: string): Promise<StoredPlan[]> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const enc = encodeURIComponent(anonymousId);
  const res = await fetch(`${base}/plans/${enc}`, { method: "GET" });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as StoredPlan[];
  } catch {
    throw new Error("Server returned invalid JSON for plans list.");
  }
}

/**
 * PATCH /plans/{plan_id} — replace checklist_items (completion state).
 */
export async function updatePlanChecklist(
  planId: string,
  anonymousId: string,
  checklistItems: PlanChecklistItem[],
): Promise<StoredPlan> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const res = await fetch(
    `${base}/plans/${encodeURIComponent(planId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymous_id: anonymousId,
        checklist_items: checklistItems,
      }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as StoredPlan;
  } catch {
    throw new Error("Server returned invalid JSON for plan update.");
  }
}

/**
 * DELETE /plans/{plan_id}?anonymous_id=...
 */
export async function deletePlan(
  planId: string,
  anonymousId: string,
): Promise<DeletePlanResponse> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const q = new URLSearchParams({ anonymous_id: anonymousId });
  const res = await fetch(
    `${base}/plans/${encodeURIComponent(planId)}?${q}`,
    { method: "DELETE" },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatErrorBody(res.status, text));
  }

  try {
    return JSON.parse(text) as DeletePlanResponse;
  } catch {
    throw new Error("Server returned invalid JSON for plan delete.");
  }
}
