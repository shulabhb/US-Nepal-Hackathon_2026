import type {
  OnboardingGoal,
  OnboardingPressure,
  RoleOptionValue,
} from "@/lib/onboarding/step-one";
import {
  HELP_NEED_OPTIONS,
  PRESSURE_OPTIONS,
  ROLE_OPTIONS,
} from "@/lib/onboarding/step-one";

export function labelForStoredRole(value: string): string {
  const hit = ROLE_OPTIONS.find((o) => o.value === (value as RoleOptionValue));
  return hit?.label ?? value.replace(/_/g, " ");
}

export function labelForStoredGoal(value: string): string {
  const hit = HELP_NEED_OPTIONS.find((o) => o.value === (value as OnboardingGoal));
  return hit?.label ?? value.replace(/_/g, " ");
}

export function labelForStoredPressure(value: string): string {
  const hit = PRESSURE_OPTIONS.find(
    (o) => o.value === (value as OnboardingPressure),
  );
  return hit?.label ?? value.replace(/_/g, " ");
}
