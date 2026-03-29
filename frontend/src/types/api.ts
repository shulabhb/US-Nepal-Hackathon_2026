/**
 * API contracts for the FastAPI backend (browser-safe payloads only).
 */

/** Snapshot of the recommendations the user saw (client-computed). */
export type RecommendationSnapshot = {
  risk_label: string;
  risk_score: number;
  summary: string;
  reasons: string[];
  immediate_actions: string[];
  next_72_hour_plan: string[];
  support_route?: string[];
};

export type CheckinCreatePayload = {
  anonymous_id: string;
  step1: {
    roles: string[];
    role_other_text?: string | null;
    pressures: string[];
    pressure_other_text?: string | null;
    help_needs: string[];
    help_other_text?: string | null;
  };
  step2: {
    symptoms: string[];
    stress_level: number;
    energy_level: number;
  };
  step3: {
    sleep_duration: string;
    sleep_quality: string;
    sleep_consistency: string;
    imported_from_wearable: boolean;
  };
  step4: {
    country_of_birth: string | null;
    has_migration_history: boolean | null;
    migration_entries: {
      country: string;
      adjustment_impact: number;
    }[];
    migration_context: string | null;
  };
  step5: {
    medications: string | null;
    medical_conditions: string | null;
    additional_context: string | null;
    consent_to_sensitive_context: boolean | null;
  };
  /** Normalized full context for analytics / future model use. */
  raw_payload?: Record<string, unknown> | null;
  /** What the user saw on the recommendations screen at save time. */
  recommendation_snapshot?: RecommendationSnapshot | null;
  /** Optional non-secret client hints (merged into raw_payload on server if sent). */
  client_context?: Record<string, unknown> | null;
};

/** Latest stored row — GET /checkins/{anonymous_id}. */
export type CheckinDetailResponse = {
  id: string;
  anonymous_id: string;
  /** Primary role id (first selected) for compatibility with legacy flat columns. */
  role: string;
  /** Primary pressure id (first selected). */
  pressure: string;
  /** Primary help_need id (first selected); DB column remains `goal` for compatibility. */
  goal: string;
  symptoms: string[];
  stress_level: number;
  energy_level: number;
  sleep_duration: string;
  sleep_quality: string;
  sleep_consistency: string;
  imported_from_wearable: boolean;
  additional_context?: string | null;
  raw_payload?: Record<string, unknown> | null;
  recommendation_snapshot?: Record<string, unknown> | null;
  created_at: string;
};

/** One row from GET /checkins/{anonymous_id}/history — same shape as detail. */
export type CheckinHistoryItem = CheckinDetailResponse;

/**
 * One task in a plan — mirrors backend `PlanChecklistItem`.
 * Legacy rows may omit fields until coerced server-side; UI tolerates missing pieces.
 */
export type PlanChecklistItem = {
  label: string;
  /** Present on new plans; UI falls back to `rationale` for older rows. */
  description?: string;
  /** Present on new plans; UI defaults to “Flexible” if missing. */
  time_estimate?: string;
  additional_info?: string | null;
  /** Task done — omitted/false on older saved plans until toggled. */
  completed?: boolean;
  /** @deprecated Old saves; server maps to `description` when loading. */
  rationale?: string | null;
};

export type GeneratedPlan = {
  title: string;
  plan_type: string;
  summary: string;
  time_horizon: string;
  checklist_items: PlanChecklistItem[];
  notes: string[];
};

/** User-entered task before generation — mirrors backend `UserPlanTaskInput`. */
export type UserPlanTaskInput = {
  name: string;
  priority: "high" | "medium" | "low";
  /** e.g. "45 min", "2h" — fuels time-aware generation and saved analytics. */
  estimated_time?: string | null;
};

/** Persisted with saved plans when generated from “My tasks” (daily/weekly). */
export type SavedPlanGenerationMeta = {
  version: 1;
  plan_type: string;
  schedule_kind?: "daily" | "weekly" | null;
  plan_name?: string | null;
  generate_full_schedule?: boolean;
  user_tasks?: UserPlanTaskInput[];
};

export type GeneratePlanRequest = {
  anonymous_id?: string | null;
  plan_type: string;
  user_request?: string | null;
  checkin_context: Record<string, unknown>;
  /** Rule-based burnout snapshot — calibrates intensity & recovery in generated steps. */
  burnout_context?: Record<string, unknown> | null;
  /** Trimmed question answers for the selected plan type. */
  plan_context?: Record<string, string> | null;
  /** Optional: name from “My tasks” flow. */
  plan_name?: string | null;
  /** Daily vs weekly scope for personal task plans. */
  schedule_kind?: "daily" | "weekly" | null;
  /** Tasks the user wants included; model orders and may add recovery steps. */
  user_tasks?: UserPlanTaskInput[] | null;
  /** Ask model for rest, sleep, social, and fuller ordering. */
  generate_full_schedule?: boolean;
};

export type GeneratePlanResponse = {
  plan: GeneratedPlan;
  source: string;
  model: string;
};

/** Saved plan row — mirrors backend `StoredPlan`. */
export type StoredPlan = {
  id: string;
  anonymous_id: string;
  source_checkin_id: string | null;
  plan_type: string;
  title: string;
  summary: string;
  time_horizon: string;
  checklist_items: PlanChecklistItem[];
  notes: string[];
  model: string | null;
  source: string;
  created_at: string;
  plan_meta?: SavedPlanGenerationMeta | Record<string, unknown> | null;
};

export type SavePlanRequest = {
  anonymous_id: string;
  source_checkin_id?: string | null;
  plan: GeneratedPlan;
  model?: string | null;
  source?: string;
  plan_meta?: SavedPlanGenerationMeta | Record<string, unknown> | null;
};

export type SavePlanResponse = {
  plan_id: string;
  anonymous_id: string;
  status: string;
  message: string;
};

export type DeletePlanResponse = {
  status: string;
  id: string;
};

/** POST /ai/chat/reply */
export type GenerateChatReplyRequest = {
  anonymous_id: string;
  message: string;
  latest_checkin?: Record<string, unknown> | null;
  active_plan?: Record<string, unknown> | null;
  saved_plan_summaries?: Record<string, unknown>[];
  /** Rule-based burnout snapshot (non-clinical). */
  burnout_context?: Record<string, unknown> | null;
  conversation_history?: { role: string; content: string }[];
  session_context?: Record<string, unknown> | null;
};

export type GenerateChatReplyResponse = {
  reply: string;
  source: string;
  model: string;
  used_plan_context?: boolean;
  used_checkin_context?: boolean;
  caution?: string | null;
};
