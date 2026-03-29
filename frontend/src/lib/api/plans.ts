import type {
  DeletePlanResponse,
  PlanChecklistItem,
  SavePlanRequest,
  SavePlanResponse,
  StoredPlan,
} from "@/types/api";

/** Overview listens so meters unlock right after save/delete without relying on tab remount. */
export const DASHBOARD_PLANS_MUTATED_EVENT = "burnout-radar:plans-mutated";

export function emitDashboardPlansMutated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DASHBOARD_PLANS_MUTATED_EVENT));
}

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
      plan_meta: payload.plan_meta ?? null,
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
 * PATCH /plans/{plan_id} — replace checklist_items; optional `plan_meta` shallow-merge.
 */
export async function updatePlanChecklist(
  planId: string,
  anonymousId: string,
  checklistItems: PlanChecklistItem[],
  planMetaPatch?: Record<string, unknown> | null,
): Promise<StoredPlan> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      "API URL not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    );
  }

  const body: Record<string, unknown> = {
    anonymous_id: anonymousId,
    checklist_items: checklistItems,
  };
  if (planMetaPatch != null && Object.keys(planMetaPatch).length > 0) {
    body.plan_meta = planMetaPatch;
  }

  const res = await fetch(
    `${base}/plans/${encodeURIComponent(planId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
