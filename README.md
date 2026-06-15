# 9am 🌅

A swipe-based dating app with two rules that make it different from everything else:

1. **No photo uploads — ever.** Every photo on your profile is captured *live* in
   the app. There is no "choose from library" button anywhere.
2. **The camera only works between 9:00 AM and 10:00 AM.** Outside that window the
   camera is locked — and the lock is enforced on the **server** (`now()` in a
   Postgres trigger), so changing the device clock can't beat it.

Why? People post their most flattering, least realistic photos on dating apps.
Forcing every photo to be a live morning shot — bedhead and all — keeps profiles
honest. Once you've got your morning photos, the rest works like any normal swipe
app (Hinge / Match style): swipe, match, chat.

## Stack

- **Expo** (SDK 54) + **React Native**, TypeScript — runs in **Expo Go**.
  > Expo SDK 54 changed a lot. Read the versioned docs at
  > https://docs.expo.dev/versions/v54.0.0/ before writing code (see `AGENTS.md`).
- **Supabase** backend — Postgres + RLS + Storage + Realtime. The app is
  **backend-only**: it talks to Supabase with the anon key in `.env`. (The old
  local/offline mock fallback was removed.)
- `expo-camera` for live capture.
- `expo-location` + `tz-lookup` for real coordinates, reverse-geocoded area, and
  an offline IANA timezone (used both for display and the 9–10am window check).
- `expo-file-system` (SDK 54 `File.bytes()`) for reliable photo upload — RN's
  `fetch(file://).blob()` is broken, so we read bytes directly.
- `@react-native-async-storage/async-storage` for the Supabase session.
- Swipe deck + custom sliders built with React Native's own `Animated` +
  `PanResponder` (no extra gesture libraries to break in Expo Go).
- Lightweight state-based navigation via a React context (`src/context/AppContext.tsx`).

Brand: a **Bad Friends** display-font identity. Background **`#F3C521`** (gold),
accent **`#FE2000`** (red).

## Run it

```bash
npm install
cp .env.example .env   # paste your Supabase project URL + anon key
npm start              # then scan the QR code with the Expo Go app
# or: npm run android / npm run ios
```

The deck is empty until other accounts exist — create a second account (or use the
seeded mock candidates) to see matching and chat end to end. For instant testing,
turn **off** "Confirm email" in the Supabase dashboard (Auth → Providers → Email).

## The 9–10am rule

The camera is only usable for two hours a day. The window logic lives in one place
— `src/lib/time.ts` (`isWithinPhotoWindow`) — as a fast client-side check and good
UX. The **authoritative** gate is the `enforce_photo_window` trigger in
`supabase/migrations/0001_init.sql`, which stamps `taken_at` with the server clock
and rejects inserts outside 09:00–10:00 in the user's stored `timezone`. Because of
that, photos (and therefore finishing onboarding) only work inside the real window.
There is no longer a "simulate 9 AM" dev switch.

## What's built so far

- **Auth & profiles** — email/password sign-in (`AuthScreen`), profile
  load/save against Supabase (`getMyProfile` / `upsertProfile`).
- **Live morning photos** — time-gated `expo-camera`, uploaded to Storage with the
  server-side window trigger.
- **Tabbed profile editor** (`ProfileScreen`) — each section saves on its own
  ("Saved ✓"); no page-wide save/cancel. Tabs: **About** (bio + basics),
  **Matches** (age range + distance preference), **Location**, **Prompts**,
  **Interests**.
- **Location & distance** — `resolveLocation()` captures real GPS coordinates,
  reverse-geocodes the area, and derives the timezone offline. `LocationCard`
  shows connection status, your area, a live timezone clock, and a visibility
  warning (no location **or** no photo ⇒ you won't appear in the deck). Distance
  between people is a client-side haversine (`src/lib/geo.ts`), in miles.
- **Mutual preference filtering** — `candidateVisible` (`src/lib/matching.ts`)
  gates the deck on gender ↔ orientation, age range (both directions), **and**
  distance, *before* interest overlap ranks the survivors.
- **Children status, Hinge-style** — split into **have** and **want**
  (`hasKids` / `wantsKids`), independently selectable.
- **Prompts** — dynamic Hinge-style prompt cards: tap to swap the question, a
  character counter, and a 🎲 "Surprise me" shuffle (up to 4).
- **Interests** — one autocomplete search/select section **per parent category**
  (`InterestSelect`), replacing the old long chip grid.
- **Custom sliders** — `RangeSlider` (age) and `Slider` (distance, with an
  "Anywhere" toggle), PanResponder-driven and tuned so the ScrollView can't steal
  the gesture.
- **Swipe / match / chat** — deck, undo, "it's a match" modal, matches list, and
  per-match chat over Supabase Realtime.
- **Seeded mock candidates** — ~108 mock profiles with spoofed coordinates near
  the dev account, varied kids/prompts/interests, real external portrait photos.

## Project layout

```
App.tsx                     root: provider + loading gate + tab bar
src/
  theme.ts                  colours, spacing, radius, Bad Friends fonts
  types.ts                  Photo / UserProfile / Candidate / Match / Coords
  lib/
    time.ts                 the 9–10am window logic
    supabase.ts             typed Supabase client + isSupabaseConfigured
    api.ts                  data-access layer: auth, deck, swipe, matches, chat,
                            realtime, photo upload, location/distance writes
    location.ts             GPS → coords + reverse-geocoded area + timezone
    geo.ts                  haversine miles + milesBetween (null-safe)
    matching.ts             mutual gender+age+distance filter (gates the deck)
    interests.ts            interest taxonomy (7 parents) + search + score
    profileFields.ts        genders, have/want-kids, prompt bank, age/distance bounds
    slider.ts               pure slider math (clamp / snap / ratio helpers)
  context/AppContext.tsx    profile, swipes, matches, persistence
  components/
    Button.tsx  Logo.tsx  SwipeCard.tsx  PhotoView.tsx
    Slider.tsx              Slider + RangeSlider (PanResponder)
    InterestSelect.tsx      autocomplete badges, one section per parent category
    InterestPicker.tsx      (legacy chip grid, kept for onboarding reference)
    ChoiceChips.tsx         generic single/multi pill selector
    PromptPicker.tsx        dynamic prompt + answer cards
    LocationCard.tsx        connection status, area, live tz clock, visibility warning
  screens/
    AuthScreen.tsx          email/password sign-in & sign-up
    OnboardingScreen.tsx    welcome → details → take morning photos
    CameraScreen.tsx        time-gated live camera (onboarding + profile)
    SwipeScreen.tsx         the swipe deck, undo, "it's a match" modal
    CandidateDetailScreen.tsx  full profile view (tap a card)
    MatchesScreen.tsx       list of matches
    ChatScreen.tsx          per-match conversation over Realtime
    ProfileScreen.tsx       read view + tabbed editor; your photos under Edit
supabase/
  migrations/0001–0008      schema, RLS, triggers, profile fields, location/distance,
                            children split
  seed/mock_candidates.sql  idempotent mock candidates
scripts/
  db.mjs                    direct SQL runner (see SUPABASE-ACCESS.md)
  upload-mock-photos.mjs    bulk photo upload for mocks
```

## Backend & database access

- **Schema, RLS, and the photo-window trigger:** see `BACKEND.md`.
- **Running SQL / migrations:** the Supabase MCP server is **not** connected to
  this project. Use `npm run db -- "<sql>"` / `node scripts/db.mjs --file x.sql`
  (connection string in the gitignored `scripts/db.env`), or hand-off. Full detail
  in `SUPABASE-ACCESS.md`.

## Tests

Pure logic has unit tests on Node's built-in runner (Node ≥ 22) with native
TypeScript stripping — no Jest, no extra dependencies:

```bash
npm test
```

Covered: the 9–10am window (`time.test.ts`), haversine distance (`geo.test.ts`),
slider math (`slider.test.ts`), interest scoring (`interests.test.ts`), and the
mutual match filter (`matching.test.ts`).

## Planned next

- **Bad Friends update** — verification & safety (age, identity, background
  checks). See `bad-friends-update.md`.
- **Profile fields** — remaining display attributes (height, education, etc.).
  See `profile-preferences.md`.
