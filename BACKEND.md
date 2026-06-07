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

## The 8–10am rule is enforced on the server

`enforce_photo_window()` is a `BEFORE INSERT` trigger on `public.photos`. It:

1. Overwrites `taken_at` with the **server clock** (`now()`), so a client can't
   supply a fake time, and
2. Rejects the insert if the server time isn't between 08:00 and 10:00 in the
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

## Activating it in the app (the "connect later" step)

Once the above works, the remaining task is to replace the local mock in
`AppContext` with calls into `src/lib/api.ts`, and add a sign-in screen ahead of
onboarding. The api functions already map onto the app's existing types
(`Candidate`, `ChatMessage`, `Photo`), so it's a focused swap — ping me and we'll
do it together against the live project so we can verify each piece.

## Auth note

Email + password is set up for now (simplest to test). When you want phone OTP or
magic links, it's a provider toggle in the dashboard plus a small change to the
sign-in screen — no schema changes needed.
