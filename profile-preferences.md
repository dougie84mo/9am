# Profile Fields & Match Preferences

> **Status: PLANNED — not started.** Scope/design only; nothing here is built
> yet. Companion to the interests system that already shipped
> (`src/lib/interests.ts`, `InterestPicker`) and to `bad-friends-update.md`
> (verification). We build this after the current work is verified.

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
4. How many prompts, and a fixed prompt bank or free-form?
5. Do preferences ship before or after the Supabase backend is wired?
