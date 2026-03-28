export type SleepDurationBucket =
  | "lt_5"
  | "h_5_6"
  | "h_6_7"
  | "h_7_8"
  | "gt_8";

export type SleepQualityLevel = "poor" | "okay" | "good";

export type SleepConsistencyLevel =
  | "very_inconsistent"
  | "somewhat_consistent"
  | "consistent";

export type OnboardingStep3 = {
  duration: SleepDurationBucket;
  quality: SleepQualityLevel;
  consistency: SleepConsistencyLevel;
  importedFromWearable: boolean;
};

export const DURATION_OPTIONS: {
  value: SleepDurationBucket;
  label: string;
}[] = [
  { value: "lt_5", label: "Less than 5 hours" },
  { value: "h_5_6", label: "5–6 hours" },
  { value: "h_6_7", label: "6–7 hours" },
  { value: "h_7_8", label: "7–8 hours" },
  { value: "gt_8", label: "More than 8 hours" },
];

export const QUALITY_OPTIONS: {
  value: SleepQualityLevel;
  label: string;
}[] = [
  { value: "poor", label: "Poor" },
  { value: "okay", label: "Okay" },
  { value: "good", label: "Good" },
];

export const CONSISTENCY_OPTIONS: {
  value: SleepConsistencyLevel;
  label: string;
}[] = [
  { value: "very_inconsistent", label: "Very inconsistent" },
  { value: "somewhat_consistent", label: "Somewhat consistent" },
  { value: "consistent", label: "Consistent" },
];

/** Demo-only values for the mock wearable action */
export const SAMPLE_WEARABLE_STEP3: Omit<OnboardingStep3, "importedFromWearable"> =
  {
    duration: "h_6_7",
    quality: "okay",
    consistency: "somewhat_consistent",
  };
