# 9am 🌅

A swipe-based dating app with two rules that make it different from everything else:

1. **No photo uploads — ever.** Every photo on your profile is captured *live* in
   the app. There is no "choose from library" button anywhere.
2. **The camera only works between 9:00 AM and 10:00 AM.** Outside that window the
   camera is locked.

Why? People post their most flattering, least realistic photos on dating apps.
Forcing every photo to be a live morning shot — bedhead and all — keeps profiles
honest. Once you've got your morning photos, the rest works like any normal swipe
app (Hinge / Match style): swipe, match, done.

## Stack

- **Expo** (SDK 54) + **React Native**, TypeScript — runs in **Expo Go**.
- `expo-camera` for live capture.
- `@react-native-async-storage/async-storage` for on-device persistence.
- Swipe deck built with React Native's own `Animated` + `PanResponder` (no extra
  gesture libraries to break in Expo Go).
- Lightweight state-based navigation via a React context (`src/context/AppContext.tsx`).

Brand colours: background **`#F3C521`** (gold), accent **`#FE2000`** (red).

## Run it

```bash
npm install
npm start          # then scan the QR code with the Expo Go app
# or: npm run android / npm run ios
```

## The 9–10am rule while developing

The camera is only usable for two hours a day, which makes the app hard to demo
the rest of the time. On the camera lock screen there's a clearly-labelled
**"Developer: simulate 9 AM"** switch that bypasses the time gate so you can test
capture anytime. The real gate lives in one place — `src/lib/time.ts`
(`isWithinPhotoWindow`) — so there's a single source of truth.

## Project layout

```
App.tsx                     root: provider + loading gate + tab bar
src/
  theme.ts                  colours, spacing, radius
  types.ts                  Photo / UserProfile / Candidate / Match
  lib/
    time.ts                 the 9–10am window logic (+ dev bypass)
    storage.ts              AsyncStorage helpers
    mockProfiles.ts         seed candidates for the deck
    interests.ts            interest taxonomy (7 parents) + matching score
    profileFields.ts        genders, children status, prompt bank, age bounds
    matching.ts             mutual gender+age preference filter (gates the deck)
  context/AppContext.tsx    profile, swipes, matches, persistence
  components/
    Button.tsx  Logo.tsx  SwipeCard.tsx
    PhotoView.tsx           image with an offline gradient-initial fallback
    InterestPicker.tsx      category chips, max 7 per parent
    ChoiceChips.tsx         generic single/multi pill selector
    PromptPicker.tsx        pick + answer up to 3 personal-question prompts
  screens/
    OnboardingScreen.tsx    welcome → details → take morning photos
    CameraScreen.tsx        time-gated live camera (used in onboarding + profile)
    SwipeScreen.tsx         the swipe deck, undo, "it's a match" modal
    MatchesScreen.tsx       list of matches
    ChatScreen.tsx          per-match conversation (simulated replies)
    ProfileScreen.tsx       your profile, add photos, start over
```

## Tests

The 9–10am window logic is the one piece with real edge cases, so it has unit
tests. They run on Node's built-in test runner (Node ≥ 22) with native
TypeScript stripping — no Jest, no extra dependencies:

```bash
npm test
```

## Notes / next steps

- Candidate photos in the deck are remote placeholder portraits standing in for
  the real morning selfies a live app would store. When there's no internet in
  Expo Go they fall back to a tinted card showing the person's initial
  (`PhotoView`), so the deck still works fully offline.
- No backend yet — matches and chat replies are simulated locally. The scaffolded
  Supabase backend (see `BACKEND.md`) is the next step for real accounts, photo
  storage, and mutual matching.
