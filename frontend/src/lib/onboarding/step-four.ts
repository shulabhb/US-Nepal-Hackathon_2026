/** Optional background / migration context (step 4). All fields optional at persistence. */

export type MigrationEntry = {
  country: string;
  adjustment_impact: number;
};

export type OnboardingStep4 = {
  country_of_birth: string | null;
  has_migration_history: boolean | null;
  migration_entries: MigrationEntry[];
  migration_context: string | null;
};

export function emptyStep4(): OnboardingStep4 {
  return {
    country_of_birth: null,
    has_migration_history: null,
    migration_entries: [],
    migration_context: null,
  };
}
