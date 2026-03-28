-- Burnout Radar: anonymous check-ins (run in Supabase SQL editor or via migration tool)
-- Requires: extension for UUID generation (usually already enabled on Supabase)

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  role text not null,
  pressure text not null,
  goal text not null,
  symptoms text[] not null,
  stress_level smallint not null,
  energy_level smallint not null,
  sleep_duration text not null,
  sleep_quality text not null,
  sleep_consistency text not null,
  imported_from_wearable boolean not null default false,
  additional_context text,
  raw_payload jsonb,
  recommendation_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists checkins_anonymous_id_idx
  on public.checkins (anonymous_id);

create index if not exists checkins_created_at_idx
  on public.checkins (created_at desc);

-- RLS: adjust to your security model. Example for hackathon backend using service role
-- (service role bypasses RLS). If you use the anon key, add policies e.g.:
--
-- alter table public.checkins enable row level security;
-- create policy "allow_insert_checkins" on public.checkins for insert with (check = true);
-- create policy "allow_select_own_anon" on public.checkins for select using (true);
