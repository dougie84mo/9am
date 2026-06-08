-- 9am — move the server-enforced photo window from 08:00–10:00 to 09:00–10:00,
-- to match the app's name. Same trusted-server-clock logic; only the start hour
-- changes. (The client window lives in src/lib/time.ts.)

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
  select timezone into tz from public.profiles where id = new.user_id;
  if tz is null then
    tz := 'UTC';
  end if;

  new.taken_at := now();
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
