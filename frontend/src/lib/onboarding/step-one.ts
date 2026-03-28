/**
 * Step 1 — multi-select roles, pressures, and help needs + optional “other” text.
 * Stored values are stable string ids (snake_case).
 */

export const ROLE_OPTION_VALUES = [
  "student",
  "professional",
  "job_seeker",
  "caregiver",
  "other",
] as const;
export type RoleOptionValue = (typeof ROLE_OPTION_VALUES)[number];

export const PRESSURE_OPTION_VALUES = [
  "academics",
  "workload",
  "job_search",
  "career_uncertainty",
  "family_expectations",
  "money",
  "sleep_issues",
  "burnout_exhaustion",
  "relationships",
  "health_concerns",
  "other",
] as const;
export type PressureOptionValue = (typeof PRESSURE_OPTION_VALUES)[number];

/** “What would help most” — help_need ids (overlap with legacy goal ids). */
export const HELP_NEED_OPTION_VALUES = [
  "sleep_better",
  "focus_better",
  "less_overwhelmed",
  "manage_burnout",
  "get_a_plan",
  "talk_to_someone_safely",
  "improve_routine",
  "calm_now",
  "other",
] as const;
export type HelpNeedOptionValue = (typeof HELP_NEED_OPTION_VALUES)[number];

export type OnboardingStep1Data = {
  roles: string[];
  role_other_text?: string | null;
  pressures: string[];
  pressure_other_text?: string | null;
  help_needs: string[];
  help_other_text?: string | null;
};

export const ROLE_OPTIONS: { value: RoleOptionValue; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
  { value: "job_seeker", label: "Job seeker" },
  { value: "caregiver", label: "Caregiver" },
  { value: "other", label: "Other" },
];

export const PRESSURE_OPTIONS: {
  value: PressureOptionValue;
  label: string;
}[] = [
  { value: "academics", label: "Academics" },
  { value: "workload", label: "Workload" },
  { value: "job_search", label: "Job search" },
  { value: "career_uncertainty", label: "Career uncertainty" },
  { value: "family_expectations", label: "Family expectations" },
  { value: "money", label: "Money" },
  { value: "sleep_issues", label: "Sleep issues" },
  { value: "burnout_exhaustion", label: "Burnout / exhaustion" },
  { value: "relationships", label: "Relationships" },
  { value: "health_concerns", label: "Health concerns" },
  { value: "other", label: "Other" },
];

export const HELP_NEED_OPTIONS: {
  value: HelpNeedOptionValue;
  label: string;
}[] = [
  { value: "sleep_better", label: "Sleep better" },
  { value: "focus_better", label: "Focus better" },
  { value: "less_overwhelmed", label: "Feel less overwhelmed" },
  { value: "manage_burnout", label: "Manage burnout" },
  { value: "get_a_plan", label: "Get a plan" },
  { value: "talk_to_someone_safely", label: "Talk to someone safely" },
  { value: "improve_routine", label: "Improve routine" },
  { value: "calm_now", label: "Calm down right now" },
  { value: "other", label: "Other" },
];

/** Legacy singular types — used by scoring hint maps. */
export type OnboardingPressure = Exclude<PressureOptionValue, "other">;
export type OnboardingGoal = Exclude<HelpNeedOptionValue, "other">;
