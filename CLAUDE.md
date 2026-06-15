@AGENTS.md

# 9am — project state & progress

9am is a swipe-based dating app (Expo SDK 54 / React Native / TypeScript,
Supabase backend). Two product rules: **live-only photos** (no library uploads)
and **the camera works only 9:00–10:00 AM**, enforced server-side by a Postgres
trigger (`enforce_photo_window`). See `README.md` for the full overview and
`BACKEND.md` for the schema.

## How to work here

- **Read the versioned Expo 54 docs** before writing native code
  (https://docs.expo.dev/versions/v54.0.0/). SDK 54 changed APIs.
- **No extra gesture/UI libraries** — the swipe deck and sliders use RN's own
  `Animated` + `PanResponder` so they don't break in Expo Go.
- **Backend-only.** The old local/offline mock fallback was removed; the app
  always talks to Supabase (anon key in `.env`).
- **Database:** the Supabase MCP is not connected. Run SQL via
  `npm run db -- "<sql>"` / `node scripts/db.mjs --file x.sql` (string in the
  gitignored `scripts/db.env`), or hand-off. See `SUPABASE-ACCESS.md`.
- **Git:** I (Claude) do `git add` + `git commit` (no Co-Authored-By trailer);
  the **user** runs `git push` — the dev shell has no working GitHub auth.

## What's built

- **Auth & profiles** — email/password (`AuthScreen`), `getMyProfile` /
  `upsertProfile`.
- **Live photos** — time-gated `expo-camera`; upload via `expo-file-system`
  `File.bytes()` (RN `fetch(file://).blob()` is broken); server window trigger.
- **Tabbed profile editor** (`ProfileScreen`) — About / Matches / Location /
  Prompts / Interests; each section saves independently ("Saved ✓"). Your photos
  render under the Edit button.
- **Location & distance** — `resolveLocation()` (real GPS coords +
  reverse-geocoded area + offline tz via `tz-lookup`); `LocationCard` shows
  status, area, a live tz clock, and a visibility warning (no location **or** no
  photo ⇒ not in the deck). Distance is client-side haversine miles (`geo.ts`).
- **Mutual preference filter** — `candidateVisible` (`matching.ts`) gates the
  deck on gender↔orientation, age range (both ways), and distance **before**
  interest overlap ranks survivors.
- **Children split** — `hasKids` / `wantsKids` (Hinge-style), independent.
- **Prompts** — dynamic cards (`PromptPicker`): swap question, char counter,
  🎲 shuffle, up to 4.
- **Interests** — one autocomplete section per parent category (`InterestSelect`).
- **Sliders** — `RangeSlider` (age) + `Slider` (distance, "Anywhere" toggle),
  tuned so the ScrollView can't steal the gesture; pure math in `slider.ts`.
- **Swipe / match / chat** over Supabase Realtime; ~108 seeded mock candidates
  with spoofed coords near the dev account.

## Tests

`npm test` (Node built-in runner): `time`, `geo`, `slider`, `interests`,
`matching`.

## Migrations

`supabase/migrations/0001`–`0008` (init/RLS/triggers → hardening → profile fields
→ name-check/swipe-delete fix → 9–10 window → admin photo-window bypass →
location/distance + `spoof_mock_locations_near` RPC → children split). Never edit
an applied migration; add a new numbered one.

## Planned

- `bad-friends-update.md` — verification & safety (age / identity / background).
- `profile-preferences.md` — remaining display attributes.
