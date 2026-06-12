/**
 * Structured profile attributes + match preferences (everything beyond name /
 * bio / photos / interests). See `profile-preferences.md` for the design.
 *
 * Two kinds live here:
 *  - **attributes** the person *is* (gender, profession, children status,
 *    prompt answers) — shown on the card.
 *  - **preferences** about who they want to see (preferred genders, age range)
 *    — used to hard-filter the deck (see `matching.ts`).
 */

export const GENDERS = ['Woman', 'Man', 'Nonbinary'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * Children is two separate facts (Hinge-style): what someone *has* and what they
 * *want*. They're independent — "have kids, don't want more" and "no kids, want
 * kids" are both valid combinations.
 */
export const HAS_KIDS = ['Have kids', "Don't have kids", 'Prefer not to say'] as const;
export type HasKids = (typeof HAS_KIDS)[number];

export const WANTS_KIDS = [
  'Want kids',
  'Open to kids',
  "Don't want kids",
  'Prefer not to say',
] as const;
export type WantsKids = (typeof WANTS_KIDS)[number];

/** Hinge-style personal-question bank. A user picks up to {@link MAX_PROMPTS}. */
export const PROMPTS = [
  'A perfect morning is…',
  'The way to win me over is…',
  'My most controversial opinion is…',
  "I'm weirdly competitive about…",
  'The key to my heart is…',
  'I geek out about…',
  'My simple pleasures are…',
  "We'll get along if…",
  'My ideal first date is…',
  'I take way too many photos of…',
  "I'll never shut up about…",
  'Green flags I look for…',
  'My go-to karaoke song is…',
  'Best travel story…',
  'My love language is…',
  'Dating me is like…',
  "Let's debate this…",
  "I'm looking for…",
  'My happy place is…',
  'A life goal of mine…',
  'Two truths and a lie…',
  'The quickest way to my heart…',
  'My most irrational fear is…',
  'A recent shower thought…',
  'I want someone who…',
  "We're the same type of weird if…",
] as const;

export const MAX_PROMPTS = 4;

/** Hard bounds for the age-range preference. */
export const AGE_FLOOR = 18;
export const AGE_CEILING = 99;

/** Bounds for the maximum-distance preference (miles). */
export const DISTANCE_FLOOR = 1;
export const DISTANCE_CEILING = 150;
