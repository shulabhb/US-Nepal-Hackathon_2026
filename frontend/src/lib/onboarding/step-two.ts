export type OnboardingSymptom =
  | "poor_sleep"
  | "low_energy"
  | "overthinking"
  | "panic_before_deadlines"
  | "lack_of_motivation"
  | "difficulty_focusing"
  | "skipped_class_work"
  | "irritability"
  | "social_withdrawal"
  | "feeling_stuck";

export type OnboardingStep2 = {
  symptoms: OnboardingSymptom[];
  stressLevel: number;
  energyLevel: number;
};

export const SYMPTOM_OPTIONS: {
  value: OnboardingSymptom;
  label: string;
}[] = [
  { value: "poor_sleep", label: "Poor sleep" },
  { value: "low_energy", label: "Low energy" },
  { value: "overthinking", label: "Overthinking" },
  { value: "panic_before_deadlines", label: "Panic before deadlines" },
  { value: "lack_of_motivation", label: "Lack of motivation" },
  { value: "difficulty_focusing", label: "Difficulty focusing" },
  { value: "skipped_class_work", label: "Skipped class/work" },
  { value: "irritability", label: "Irritability" },
  { value: "social_withdrawal", label: "Social withdrawal" },
  { value: "feeling_stuck", label: "Feeling stuck" },
];

export const SCALE_MIN = 1;
export const SCALE_MAX = 10;

export const SCALE_LABELS = Array.from(
  { length: SCALE_MAX - SCALE_MIN + 1 },
  (_, i) => SCALE_MIN + i,
);
