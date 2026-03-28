/** Optional health / personal context (final step 5). All optional unless user enters text (then consent required). */

export type OnboardingStep5 = {
  medications: string | null;
  medical_conditions: string | null;
  additional_context: string | null;
  consent_to_sensitive_context: boolean | null;
};

export function emptyStep5(): OnboardingStep5 {
  return {
    medications: null,
    medical_conditions: null,
    additional_context: null,
    consent_to_sensitive_context: null,
  };
}
