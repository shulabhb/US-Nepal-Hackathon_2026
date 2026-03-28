-- Optional flattened column for ad-hoc SQL on free-text context (step 4).
-- The app stores this text in raw_payload.step4 and does not require this column.
-- If you add it and still see PGRST204 in the client, reload the API schema:
-- Supabase Dashboard → Project Settings → API → "Reload schema" (wording may vary),
-- or wait a minute for PostgREST to pick up DDL.
-- Safe to re-run:

alter table public.checkins
  add column if not exists additional_context text;
