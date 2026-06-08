# 9am — backend (Supabase)

This is the **scaffolded** backend. It is written, type-checked, and ready to
activate, but the app currently runs on its local offline mock so it works in
Expo Go before you connect anything. When you're ready, follow the steps below
and we'll wire the UI (`src/context/AppContext.tsx`) to the remote layer
(`src/lib/api.ts`).

## What's included

| Piece | File |
| --- | --- |
| Schema + RLS + triggers + storage | `supabase/migrations/0001_init.sql` |
| Typed client | `src/lib/supabase.ts` |
| Data-access layer (auth, deck, swipe, matches, chat, realtime) | `src/lib/api.ts` |
| Env template | `.env.example` |

## The 9–10am rule is enforced on the server

`enforce_photo_window()` is a `BEFORE INSERT` trigger on `public.photos`. It:

1. Overwrites `taken_at` with the **server clock** (`now()`), so a client can't
   supply a fake time, and
2. Rejects the insert if the server time isn't between 09:00 and 10:00 in the
   user's stored `timezone`.

Because it uses the trusted server clock, **changing the device clock can't beat
it** — this is the "real time-lock" version. The app still keeps its client-side
gate too, as a fast first check and good UX.

## Data model

- `profiles` (1:1 with `auth.users`, holds `timezone` for the window check)
- `photos` (storage path + server `taken_at`)
- `swipes` (unique per swiper→swipee; `like`/`nope`)
- `matches` (one row per pair; created automatically by the `handle_swipe`
  trigger on a mutual like — clients can't insert matches directly)
- `messages` (per match; Realtime-enabled for live chat)

RLS is on for every table, with owner-scoped policies; `matches` is readable only
by its two participants and `messages` only within a match you belong to.

## Setup

```bash
# 1. Create a project at https://supabase.com, then:
npm i -g supabase            # if you don't have the CLI
supabase login
supabase link --project-ref <your-project-ref>

# 2. Apply the schema (or paste the SQL into the dashboard SQL editor)
supabase db push

# 3. Auth: enable Email provider in Dashboard → Authentication → Providers.
#    For quick testing, turn OFF "Confirm email" so sign-up logs you in directly.

# 4. App env
cp .env.example .env         # then paste your project URL + anon key

# 5. Run advisors and fix anything flagged
supabase db advisors         # (or the MCP get_advisors tool)
```

Restart `npm start` after creating `.env` so Expo picks up the new variables.

## Activating it in the app — DONE

The app is now wired to Supabase. `AppContext` runs in two modes, chosen at
startup by `isSupabaseConfigured`:

- **No `.env`** → the original local/offline mock (unchanged).
- **`.env` set** → backend mode: email/password auth (`AuthScreen`), profile
  load/save (`getMyProfile`/`upsertProfile`), photo upload to storage (the
  server enforces the 9–10am window on insert), deck from `fetchDeck` with the
  same mutual-preference filter + interest ranking applied client-side,
  swipes/matches, and live chat over Realtime.

Migrations `0002_hardening.sql` and `0003_profile_fields.sql` follow the initial
schema. The `profiles` table now carries the full attribute + preference set.

### Testing notes
- **Photos are server-gated to 9–10am** — even the client "simulate 9 AM" dev
  switch can't bypass the database trigger, so completing onboarding (which needs
  a photo) only works inside the real window.
- The **deck is empty until other accounts exist** — create a second account to
  see matching/chat end to end.
- For instant testing, turn **off** "Confirm email" in Auth → Providers → Email.

## Auth note

Email + password is set up for now (simplest to test). When you want phone OTP or
magic links, it's a provider toggle in the dashboard plus a small change to the
sign-in screen — no schema changes needed.
