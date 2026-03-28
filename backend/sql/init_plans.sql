-- Burnout Radar: saved AI plans (run in Supabase SQL editor after checkins exist)
-- Requires: gen_random_uuid() (typical on Supabase)

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  source_checkin_id uuid null,
  plan_type text not null,
  title text not null,
  summary text not null,
  time_horizon text not null,
  checklist_items jsonb not null,
  notes jsonb not null default '[]'::jsonb,
  model text null,
  source text not null default 'local_model',
  created_at timestamptz not null default now()
);

create index if not exists plans_anonymous_created_idx
  on public.plans (anonymous_id, created_at desc);

-- RLS: service role bypasses RLS. With anon key, add policies as needed.
