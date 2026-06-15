# Profile Fields & Match Preferences

> **Status: MOSTLY SHIPPED.** The core of this doc is now built. What landed:
> gender + orientation, age range, distance radius (haversine miles), children
> status **split into have/want** (Hinge-style), Hinge-style **prompts**
> (`PromptPicker`), and per-parent-category **interest** autocomplete
> (`InterestSelect`). The mutual hard-filter (`candidateVisible` in
> `src/lib/matching.ts`) runs **before** interest ranking, as designed below.
> Remaining: the secondary display attributes (height, education, drinking/
> smoking, pets, religion, politics, profession) and the open questions. The
> original scope is kept below for reference.

Beyond live photos and interests, a profile needs richer **attributes** and the
deck needs **mutual preference filtering**. The user called out: personal
questions, gender, sex/orientation preference, children status, profession —
"and so on" (treat the list as representative, not exhaustive).

## Two distinct concepts (this drives the data model)

These are easy to conflate but behave differently:

| Kind | Examples | Effect |
| --- | --- | --- |
| **Display attributes** | profession, children status, height, prompts | shown on the card; do **not** filter the deck |
| **Match preferences (filters)** | gender ↔ orientation, age range, distance, maybe kids | **gate** who appears in the deck, mutually |

> **Key point:** interests only *rank* the deck (`compatibilityScore` in
> `AppContext`). Preferences must *gate* it. A hard filter pass has to run
> **before** the interest-based sort — someone outside your stated preferences
> shouldn't appear at all, no matter how many interests overlap.

## Fields to add

**Display attributes**
- **Profession** (free text or a curated list)
- **Children status** — have kids / want kids / don't want / open
- Likely later: height, education, drinking/smoking, pets, religion, politics
- **Personal-question prompts** — Hinge-style prompt + answer cards (e.g. "A
  perfect morning is…"). A small curated prompt bank; user picks ~3 and answers.

**Match preferences (filters)**
- **Gender** (the user's own identity) — needs an inclusive set, not a binary
- **Sex / orientation preference** — who they want to see; combined with gender
  this produces **mutual** filtering (show B to A only if A↔B preferences agree)
- **Age range** (min/max)
- **Distance** radius (once geo exists)
- Optional deal-breakers (e.g. children status) — decide if hard or soft

## Mutual filtering logic (sketch)

```
visible(viewer, candidate) =
  candidate.gender ∈ viewer.preferredGenders
  AND viewer.gender ∈ candidate.preferredGenders
  AND candidate.age ∈ viewer.ageRange
  AND viewer.age ∈ candidate.ageRange
  (AND distance ≤ viewer.maxDistance, once geo exists)
```

Apply this filter in the `deck` memo **before** `compatibilityScore` sorts the
survivors.

## Where it touches the code

- **`src/types.ts`** — extend `UserProfile` (own attributes + preferences) and
  `Candidate` (attributes needed to filter/display). Keep backward-compat
  defaults like we did for `interests`.
- **Onboarding + Profile edit** — new steps/sections mirroring the
  `InterestPicker` pattern (chips / segmented controls / range sliders).
- **`AppContext` deck** — add the hard preference filter ahead of the sort.
- **Card UI** — render profession / kids / a prompt or two under the bio.
- **Supabase** — add columns to `profiles` (gender, preferred_genders,
  age_min/max, children_status, profession) and a `prompts` table; mirror in
  `src/lib/api.ts` (currently defaults these to empty).

## Privacy / sensitivity

Gender, orientation, and children status are **sensitive**. Make optional where
legally/ethically appropriate, allow "prefer not to say," and be deliberate
about what's shown publicly vs. used only for filtering. Coordinate with the
data-handling rules in `bad-friends-update.md`.

## Open questions (decide before building)

1. Which fields are **required** vs optional at signup?
2. Gender/orientation taxonomy — how inclusive, and is it a fixed list?
3. Are children status / other fields **hard** deal-breakers or soft signals?
   _(Shipped as soft/display for now; kids is not yet a hard filter.)_
4. How many prompts, and a fixed prompt bank or free-form? _(Shipped: bank of 26,
   pick up to 4.)_
5. Do preferences ship before or after the Supabase backend is wired? _(After —
   backend is live.)_

## Near-term future updates (do soon)

- **Secondary display attributes** — add height, education, drinking/smoking,
  pets, religion, politics, profession as optional chips/segments. Mirror the
  existing `ProfileScreen` tab pattern; add columns in a new migration and to
  `PROFILE_COLS` in `src/lib/api.ts`.
- **Kids as an optional deal-breaker** — let a user mark `wantsKids` as a hard
  filter and extend `candidateVisible` accordingly (keep it opt-in/soft by
  default).
- **Onboarding parity** — make sure every new field is editable in
  `OnboardingScreen`, not just the profile editor.
- **"Verified only" deck filter** — wire once the Bad Friends verification
  pillars land (see `bad-friends-update.md`); a `verification_level` gate in
  `candidateVisible`.
- **Distance unit toggle** — miles ⇄ km (currently miles-only).
- **Smarter ranking** — blend distance proximity into the interest score instead
  of using distance purely as a hard gate.
