-- 9am — initial schema
-- ---------------------------------------------------------------------------
-- Apply with either:
--   supabase db push                       (after `supabase link`)
-- or paste into the SQL editor in the dashboard.
--
-- Design notes:
--  * The 8–10am photo rule is enforced HERE, on the trusted server clock, in
--    the user's stored timezone — it cannot be bypassed by changing a device
--    clock (see enforce_photo_window()).
--  * RLS is enabled on every table. Since new public tables are no longer
--    auto-exposed to the Data API, we also GRANT table privileges to the
--    `authenticated` role; RLS still decides which ROWS are visible.
-- ---------------------------------------------------------------------------

-- ============================ tables =======================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  age         int  not null check (age >= 18 and age < 120),
  bio         text not null default '',
  -- IANA timezone (e.g. 'America/New_York'); used to evaluate the 8–10am window.
  timezone    text not null default 'UTC',
  created_at  timestamptz not null default now()
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- path within the 'photos' storage bucket, e.g. '<uid>/<uuid>.jpg'
  storage_path text not null,
  -- server-clock capture time; the trigger overwrites any client value.
  taken_at     timestamptz not null default now(),
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists photos_user_idx on public.photos (user_id, position);

create table if not exists public.swipes (
  id         uuid primary key default gen_random_uuid(),
  swiper     uuid not null references auth.users (id) on delete cascade,
  swipee     uuid not null references auth.users (id) on delete cascade,
  direction  text not null check (direction in ('like', 'nope')),
  created_at timestamptz not null default now(),
  unique (swiper, swipee),
  check (swiper <> swipee)
);

-- A match is one row per pair, with the smaller uuid always in user_a so the
-- pair is unique regardless of who swiped first.
create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  sender     uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- ===================== the 9am rule (server-enforced) ======================

create or replace function public.enforce_photo_window()
returns trigger
language plpgsql
security invoker          -- runs as the inserting user; RLS lets them read own profile
set search_path = public
as $$
declare
  tz         text;
  local_time time;
begin
  select timezone into tz from public.profiles where id = new.user_id;
  if tz is null then
    tz := 'UTC';
  end if;

  -- Always stamp with the trusted server clock; never trust a client value.
  new.taken_at := now();
  local_time := (now() at time zone tz)::time;

  if local_time < time '08:00' or local_time >= time '10:00' then
    raise exception
      '9am rule: photos can only be taken between 08:00 and 10:00 your local time (it is now % in %)',
      to_char(local_time, 'HH24:MI'), tz
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_photo_window
  before insert on public.photos
  for each row execute function public.enforce_photo_window();

-- ===================== mutual-like => match ================================
-- SECURITY DEFINER so it can insert into matches on behalf of both users
-- (bypassing RLS). It is reachable only as a trigger, never as a public RPC:
-- we revoke EXECUTE from the API roles below.

create or replace function public.handle_swipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.direction = 'like'
     and exists (
       select 1 from public.swipes s
       where s.swiper = new.swipee
         and s.swipee = new.swiper
         and s.direction = 'like'
     )
  then
    insert into public.matches (user_a, user_b)
    values (least(new.swiper, new.swipee), greatest(new.swiper, new.swipee))
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_swipe() from public, anon, authenticated;

create trigger trg_handle_swipe
  after insert on public.swipes
  for each row execute function public.handle_swipe();

-- auto-create an empty profile row on signup (filled in during onboarding)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, age)
  values (new.id, '', 18)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================== RLS ========================================

alter table public.profiles enable row level security;
alter table public.photos   enable row level security;
alter table public.swipes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;

-- profiles: everyone signed in can browse profiles; you may only write your own.
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "insert own profile"
  on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- photos: browsable by authenticated (needed for the deck); write your own.
create policy "photos readable by authenticated"
  on public.photos for select to authenticated using (true);
create policy "insert own photos"
  on public.photos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own photos"
  on public.photos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own photos"
  on public.photos for delete to authenticated using ((select auth.uid()) = user_id);

-- swipes: you can read and create only your own swipes.
create policy "read own swipes"
  on public.swipes for select to authenticated using ((select auth.uid()) = swiper);
create policy "insert own swipes"
  on public.swipes for insert to authenticated with check ((select auth.uid()) = swiper);

-- matches: visible only to the two participants. No client writes — only the
-- SECURITY DEFINER trigger inserts matches.
create policy "read own matches"
  on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- messages: read/write only within a match you belong to.
create policy "read messages in own matches"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (select auth.uid()) in (m.user_a, m.user_b)
  ));
create policy "send messages in own matches"
  on public.messages for insert to authenticated
  with check (
    sender = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (select auth.uid()) in (m.user_a, m.user_b)
    )
  );

-- ===================== Data API grants =====================================
-- New public tables are not auto-exposed; grant table privileges explicitly.
-- (RLS above still controls which rows each role can touch.)

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.photos   to authenticated;
grant select, insert                 on public.swipes    to authenticated;
grant select                         on public.matches   to authenticated;
grant select, insert                 on public.messages  to authenticated;

-- ===================== realtime ============================================
-- Live chat: stream new messages to participating clients.
alter publication supabase_realtime add table public.messages;

-- ===================== storage bucket ======================================
-- Public-read bucket so profile photos are viewable in the deck; writes are
-- restricted to each user's own folder ('<uid>/...'). Upsert needs
-- INSERT + SELECT + UPDATE, so all three are granted on own-folder objects.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos public read"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
