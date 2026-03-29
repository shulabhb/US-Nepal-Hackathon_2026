-- Optional JSON blob: user task inputs, times, schedule scope (for analytics / burnout signals).
-- Safe to run once in Supabase SQL editor.

alter table public.plans
  add column if not exists plan_meta jsonb null;

comment on column public.plans.plan_meta is
  'User-entered plan context at generation time (tasks, estimated times, daily/weekly, flags).';
