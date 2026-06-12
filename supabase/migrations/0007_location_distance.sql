-- 9am — coordinates + distance preference
-- ---------------------------------------------------------------------------
-- Adds real geo so the deck can be filtered by distance:
--   * latitude / longitude  — a profile's resolved location (set from the
--     device GPS for real users; spoofed for mock candidates).
--   * max_distance           — the viewer's search radius in MILES. NULL means
--     "Anywhere" (no distance filter).
-- Distances themselves are computed client-side (haversine, see src/lib/geo.ts)
-- between the viewer's coords and each candidate's, so we never store a
-- viewer-relative number on the row.
--
-- All nullable / defaulted, so the auth trigger's empty starter profile and any
-- pre-existing rows stay valid; existing grants to `authenticated` cover them.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists latitude     double precision,
  add column if not exists longitude    double precision,
  add column if not exists max_distance int default 50;

-- Dev utility: scatter the mock/seed candidates (ids starting 'bbbb') to random
-- points within `radius_miles` of a center, and (optionally) stamp them with the
-- caller's timezone so "near me" mocks share the viewer's 9–10am window. Admin
-- only — it deliberately writes other users' rows, so it is SECURITY DEFINER and
-- gated on the admin role the app already sets in app_metadata.
create or replace function public.spoof_mock_locations_near(
  center_lat   double precision,
  center_lon   double precision,
  tz           text             default null,
  radius_miles double precision default 50
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'spoof_mock_locations_near: admin only';
  end if;

  -- Uniform-ish point in a disc: distance = R*sqrt(U), bearing = 2*pi*U.
  -- ~69 miles per degree of latitude; longitude degrees shrink by cos(lat).
  update public.profiles p set
    latitude  = center_lat + (r.d / 69.0) * cos(r.b),
    longitude = center_lon + (r.d / (69.0 * cos(radians(center_lat)))) * sin(r.b),
    timezone  = coalesce(tz, p.timezone)
  from (
    select id,
           radius_miles * sqrt(random()) d,
           2 * pi() * random()           b
    from public.profiles
    where id::text like 'bbbb%'
  ) r
  where p.id = r.id;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.spoof_mock_locations_near(
  double precision, double precision, text, double precision
) to authenticated;
