-- 9am — richer profile attributes + match preferences
-- ---------------------------------------------------------------------------
-- Mirrors the app's UserProfile/Candidate beyond name/age/bio: gender,
-- profession, children status, the age-range + preferred-genders match
-- preferences, interest ids, and the Hinge-style prompt answers.
--
-- All columns are nullable or defaulted so the auth trigger's empty starter
-- profile (handle_new_user) and any rows created before this migration stay
-- valid. Existing table-level grants to `authenticated` cover the new columns.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists gender            text,
  add column if not exists profession        text   not null default '',
  add column if not exists children_status   text,
  add column if not exists age_min           int    not null default 18,
  add column if not exists age_max           int    not null default 99,
  add column if not exists preferred_genders text[] not null default '{}',
  add column if not exists interests         text[] not null default '{}',
  add column if not exists prompts           jsonb  not null default '[]'::jsonb;
