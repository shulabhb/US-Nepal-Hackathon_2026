-- Add JSON blobs for model-ready context and recommendation audit trail.
-- Safe to re-run (IF NOT EXISTS).

alter table public.checkins
  add column if not exists raw_payload jsonb;

alter table public.checkins
  add column if not exists recommendation_snapshot jsonb;
