/**
 * Pre-generation plan context: field definitions per plan type.
 * Keys are sent in `plan_context` on POST /ai/plan/generate.
 */

export type PlanContextField = {
  key: string;
  label: string;
  kind: "text" | "select" | "textarea";
  /** Only when kind === "select" */
  options?: readonly { value: string; label: string }[];
};

/** Plan tab + chat plan builder — ids must match backend `plan_type`. */
export const PLAN_TYPE_OPTIONS = [
  { id: "personal_tasks", label: "My tasks (daily or weekly)" },
  { id: "stress_reset", label: "Stress reset" },
  { id: "sleep_reset", label: "Sleep reset" },
  { id: "study_plan", label: "Study plan" },
  { id: "workload_plan", label: "Workload plan" },
  { id: "fitness_plan", label: "Fitness plan" },
  { id: "job_search_plan", label: "Job search plan" },
  { id: "custom_plan", label: "Something else" },
] as const;

export type PlanTypeId = (typeof PLAN_TYPE_OPTIONS)[number]["id"];

export const JOB_SEARCH_STAGE_OPTIONS = [
  { value: "Exploring roles", label: "Exploring roles" },
  { value: "Resume / portfolio prep", label: "Resume / portfolio prep" },
  { value: "Applying consistently", label: "Applying consistently" },
  { value: "Interview preparation", label: "Interview preparation" },
  { value: "Waiting on responses", label: "Waiting on responses" },
  { value: "Mixed / multiple stages", label: "Mixed / multiple stages" },
] as const;

export const PLAN_CONTEXT_FIELDS: Record<string, readonly PlanContextField[]> = {
  study_plan: [
    { key: "studying_for", label: "What are you studying for?", kind: "text" },
    {
      key: "due_or_exam",
      label: "When is it due or when is the exam?",
      kind: "text",
    },
    {
      key: "time_per_day",
      label: "How much time can you realistically give each day?",
      kind: "text",
    },
    {
      key: "hardest_right_now",
      label: "What feels hardest right now?",
      kind: "text",
    },
  ],
  fitness_plan: [
    { key: "goal", label: "What’s your goal?", kind: "text" },
    {
      key: "days_per_week",
      label: "How many days per week can you commit?",
      kind: "text",
    },
    {
      key: "limitations",
      label: "Any limitations or important health considerations?",
      kind: "text",
    },
    {
      key: "usually_gets_in_way",
      label: "What usually gets in the way?",
      kind: "text",
    },
  ],
  sleep_reset: [
    {
      key: "usual_sleep_time",
      label: "What time do you usually fall asleep?",
      kind: "text",
    },
    {
      key: "want_sleep_time",
      label: "What time do you want to sleep?",
      kind: "text",
    },
    {
      key: "disrupts_sleep",
      label: "What disrupts your sleep most?",
      kind: "text",
    },
    {
      key: "sleep_horizon",
      label: "Is this for tonight, the next few days, or longer?",
      kind: "text",
    },
  ],
  workload_plan: [
    {
      key: "main_tasks",
      label: "What are the main tasks or responsibilities?",
      kind: "text",
    },
    {
      key: "most_urgent",
      label: "What feels most urgent?",
      kind: "text",
    },
    {
      key: "most_overwhelming",
      label: "What feels most overwhelming?",
      kind: "text",
    },
    {
      key: "focused_time_available",
      label: "How much focused time do you have available?",
      kind: "text",
    },
  ],
  stress_reset: [
    {
      key: "driving_stress",
      label: "What’s driving your stress most right now?",
      kind: "text",
    },
    {
      key: "stress_horizon",
      label: "Do you want a plan for today, this week, or both?",
      kind: "text",
    },
    {
      key: "gentle_or_structured",
      label: "Do you want something gentle or more structured?",
      kind: "text",
    },
  ],
  job_search_plan: [
    {
      key: "target_roles",
      label: "What roles are you targeting?",
      kind: "text",
    },
    {
      key: "current_stage",
      label: "What stage are you in right now?",
      kind: "select",
      options: JOB_SEARCH_STAGE_OPTIONS,
    },
    {
      key: "hardest_part",
      label: "What feels hardest right now?",
      kind: "text",
    },
    {
      key: "time_available",
      label:
        "How much time can you realistically give each day or week?",
      kind: "text",
    },
  ],
  custom_plan: [
    {
      key: "plan_topic",
      label: "What is this plan about?",
      kind: "textarea",
    },
    {
      key: "progress_goal",
      label: "What are you trying to make progress on?",
      kind: "text",
    },
    {
      key: "hardest_part",
      label: "What feels hardest right now?",
      kind: "text",
    },
    {
      key: "time_or_energy_available",
      label: "How much time or energy can you realistically give this?",
      kind: "text",
    },
  ],
};

const MIN_CONTEXT_ANSWERS = 2;

/** Keys for custom_plan validation and payloads. */
export const CUSTOM_PLAN_CONTEXT_KEYS = [
  "plan_topic",
  "progress_goal",
  "hardest_part",
  "time_or_energy_available",
] as const;

export function fieldsForPlanType(planType: string): readonly PlanContextField[] {
  return PLAN_CONTEXT_FIELDS[planType] ?? [];
}

export function countFilledContextAnswers(
  planType: string,
  answers: Record<string, string>,
): number {
  const fields = fieldsForPlanType(planType);
  let n = 0;
  for (const f of fields) {
    const v = (answers[f.key] ?? "").trim();
    if (v) n += 1;
  }
  return n;
}

/** Validation for plan type `personal_tasks` (handled in Plan tab, not plan_context fields). */
export function hasEnoughPersonalTasksInput(
  planName: string,
  scheduleKind: "daily" | "weekly" | "",
  tasks: readonly { name: string }[],
): boolean {
  if (!planName.trim() || !scheduleKind) return false;
  const withNames = tasks.filter((t) => t.name.trim().length > 0);
  return withNames.length >= 1;
}

export function hasEnoughPlanContext(
  planType: string,
  answers: Record<string, string>,
): boolean {
  if (planType === "personal_tasks") {
    return false;
  }
  if (planType === "custom_plan") {
    const topic = (answers.plan_topic ?? "").trim();
    if (!topic) return false;
    const filled = CUSTOM_PLAN_CONTEXT_KEYS.filter(
      (k) => (answers[k] ?? "").trim().length > 0,
    ).length;
    return filled >= 2;
  }
  return countFilledContextAnswers(planType, answers) >= MIN_CONTEXT_ANSWERS;
}

/** Non-empty trimmed entries only, for the API payload. */
export function buildPlanContextPayload(
  planType: string,
  answers: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fieldsForPlanType(planType)) {
    const v = (answers[f.key] ?? "").trim();
    if (v) out[f.key] = v;
  }
  return out;
}
