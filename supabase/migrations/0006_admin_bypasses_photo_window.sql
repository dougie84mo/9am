-- 9am — let admins bypass the photo window for testing.
-- ---------------------------------------------------------------------------
-- Admin status is read from the trusted JWT app_metadata (set server-side, not
-- user-editable). Non-admins are still held to 9:00–10:00 in their stored
-- timezone on the trusted server clock.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_photo_window()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  tz         text;
  local_time time;
begin
  new.taken_at := now();

  -- Admins bypass the window (testing).
  if (auth.jwt() #>> '{app_metadata,role}') = 'admin' then
    return new;
  end if;

  select timezone into tz from public.profiles where id = new.user_id;
  if tz is null then
    tz := 'UTC';
  end if;

  local_time := (now() at time zone tz)::time;

  if local_time < time '09:00' or local_time >= time '10:00' then
    raise exception
      '9am rule: photos can only be taken between 09:00 and 10:00 your local time (it is now % in %)',
      to_char(local_time, 'HH24:MI'), tz
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
