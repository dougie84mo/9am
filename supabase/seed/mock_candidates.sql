-- 9am — mock candidate seed (100 profiles: 50 women, 50 men, ages 20–35)
-- ---------------------------------------------------------------------------
-- Prototype/demo data. Creates real auth.users rows (so they satisfy the
-- profiles FK and appear in the deck), fills their profiles, and gives each a
-- placeholder photo. The photo files don't exist yet, so the app renders them
-- as gradient-initial cards until real images are uploaded to the `photos`
-- bucket at each row's storage_path (see scripts/upload-mock-photos.mjs).
--
-- Idempotent: fixed `bbbb…` uuids + on-conflict-do-nothing, and it clears its
-- own prior photos first, so it can be re-run. Run via the Supabase SQL editor
-- or MCP execute_sql (it disables the photo-window trigger for the seed).
-- ---------------------------------------------------------------------------

-- Clear prior runs' photos for these users (keeps it re-runnable).
delete from public.photos
where user_id::text like 'bbbb%';

drop table if exists public._seed100;
create table public._seed100 as
with
fnames as (select array['Olivia','Emma','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Ella','Scarlett','Grace','Chloe','Lily','Aria','Zoe','Nora','Hannah','Layla','Lillian','Addison','Aubrey','Ellie','Stella','Natalie','Zoey','Leah','Hazel','Violet','Aurora','Savannah','Audrey','Brooklyn','Bella','Claire','Skylar','Lucy','Paisley','Everly','Anna','Caroline','Nova','Genesis','Emilia','Kennedy','Ruby','Willow']::text[] farr),
mnames as (select array['Liam','Noah','Oliver','James','Elijah','William','Henry','Lucas','Benjamin','Theodore','Mateo','Levi','Sebastian','Daniel','Jack','Michael','Alexander','Owen','Asher','Samuel','Ethan','Miles','Jackson','Mason','Ezra','John','Hudson','Luca','Aiden','Joseph','David','Jacob','Logan','Luke','Julian','Gabriel','Grayson','Wyatt','Matthew','Carter','Jayden','Dylan','Caleb','Nathan','Ryan','Adrian','Christopher','Joshua','Thomas','Charlie']::text[] marr),
profs as (select array['Designer','Teacher','Nurse','Engineer','Chef','Photographer','Writer','Barista','Architect','Marketer','Lawyer','Musician','Developer','Physiotherapist','Student']::text[] parr),
bios as (select array['Pre-coffee and proud of it.','New in town, show me around.','Sunrise person, bring snacks.','Looking for a partner in crime.','Probably at a farmers market.','Dog person, plant collector.','Here for good mornings and bad puns.','Weekend hiker, weekday dreamer.','Will trade playlists for coffee.','Low-key competitive at board games.','Ask me about my sourdough.','Just here for the brunch.']::text[] barr),
childs as (select array['Have kids','Want kids','Don''t want kids','Open to kids','Prefer not to say']::text[] carr),
ipool as (select array['Activities:Hiking','Activities:Travel','Activities:Photography','Activities:Reading','Activities:Dancing','Sports:Running','Sports:Yoga','Sports:Cycling','Sports:Tennis','Sports:Swimming','Learning:Languages','Learning:Coding','Learning:Psychology','Learning:History','Music:Indie','Music:Jazz','Music:Pop','Music:Hip hop','Music:Classical','Gaming:Board games','Gaming:PC gaming','Food:Coffee','Food:Brunch','Food:Cooking','Food:Wine','Food:Baking','Values:Kindness','Values:Adventure','Values:Family','Values:Ambition']::text[] iarr),
ppool as (select array[
  jsonb_build_object('prompt','A perfect morning is…','answer','Coffee, sunshine, and no alarms.'),
  jsonb_build_object('prompt','The way to win me over is…','answer','Bring snacks and good playlists.'),
  jsonb_build_object('prompt','I geek out about…','answer','Tiny museums and big breakfasts.'),
  jsonb_build_object('prompt','We''ll get along if…','answer','You love a slow morning.'),
  jsonb_build_object('prompt','My ideal first date is…','answer','A walk, a coffee, and zero pressure.'),
  jsonb_build_object('prompt','I''ll never shut up about…','answer','My weekend plans and my dog.'),
  jsonb_build_object('prompt','Green flags I look for…','answer','Kindness and a sense of humor.'),
  jsonb_build_object('prompt','My simple pleasures are…','answer','Sunrises, good bread, and long walks.')
]::jsonb[] parr2),
nums as (
  select g n, 'Woman'::text gender, f.farr[g] nm, array['Man']::text[] pref
  from generate_series(1,50) g cross join fnames f
  union all
  select 50+g, 'Man', m.marr[g], array['Woman']::text[]
  from generate_series(1,50) g cross join mnames m
)
select
  n,
  ('bbbb' || lpad(n::text,4,'0') || '-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid id,
  lower(nm) || n || '.mock@9am.test' email,
  nm name,
  20 + (n % 16) age,
  gender,
  p.parr[1 + (n % 15)] profession,
  c.carr[1 + (n % 5)] children_status,
  18 age_min, 99 age_max,
  pref preferred_genders,
  i.iarr[(1 + (n % 25)):(5 + (n % 25))] interests,
  jsonb_build_array(pp.parr2[1 + (n % 8)]) prompts,
  b.barr[1 + (n % 12)] bio
from nums
  cross join profs p cross join bios b cross join childs c cross join ipool i cross join ppool pp;

insert into auth.users (id, aud, role, email, created_at, updated_at)
  select id, 'authenticated', 'authenticated', email, now(), now()
  from public._seed100 on conflict (id) do nothing;

update public.profiles pr set
  name = s.name, age = s.age, bio = s.bio, gender = s.gender,
  profession = s.profession, children_status = s.children_status,
  age_min = s.age_min, age_max = s.age_max,
  preferred_genders = s.preferred_genders, interests = s.interests,
  prompts = s.prompts, timezone = 'America/New_York'
from public._seed100 s where pr.id = s.id;

-- Spoof a starting location: scatter every mock within ~50 miles of a default
-- center (New York City). Use the admin "Place mock profiles near me" dev tool
-- in the app — or call public.spoof_mock_locations_near(lat, lon, tz) — to
-- re-center them on a real user so the distance filter has local matches.
update public.profiles pr set
  latitude  = 40.7128 + ((50.0 * sqrt(random())) / 69.0) * cos(2 * pi() * random()),
  longitude = -74.0060 + ((50.0 * sqrt(random())) / (69.0 * cos(radians(40.7128)))) * sin(2 * pi() * random())
where pr.id::text like 'bbbb%';

-- Photos: external portrait URLs (the app passes full URLs through as-is). Swap
-- for your own storage uploads later via scripts/upload-mock-photos.mjs.
alter table public.photos disable trigger trg_enforce_photo_window;
insert into public.photos (user_id, storage_path, taken_at, position)
  select id,
    case when gender = 'Man'
      then 'https://randomuser.me/api/portraits/men/'   || (n - 50) || '.jpg'
      else 'https://randomuser.me/api/portraits/women/' || n || '.jpg'
    end,
    (date_trunc('day', now() at time zone 'America/New_York') + interval '9 hours' + ((n % 60) || ' minutes')::interval) at time zone 'America/New_York',
    0
  from public._seed100;
alter table public.photos enable trigger trg_enforce_photo_window;

drop table public._seed100;
