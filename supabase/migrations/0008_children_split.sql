-- 9am — split children status into "have" and "want"
-- ---------------------------------------------------------------------------
-- Children is two independent facts (Hinge-style): what a person *has* and what
-- they *want*. Replaces the single `children_status` field in the app. The old
-- column is left in place (unused) so historical rows aren't disturbed.
--
-- Both nullable; existing grants to `authenticated` cover the new columns.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists has_kids   text,
  add column if not exists wants_kids text;
