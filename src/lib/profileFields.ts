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

export const CHILDREN_STATUS = [
  'Have kids',
  'Want kids',
  "Don't want kids",
  'Open to kids',
  'Prefer not to say',
] as const;
export type ChildrenStatus = (typeof CHILDREN_STATUS)[number];

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
] as const;

export const MAX_PROMPTS = 3;

/** Hard bounds for the age-range preference. */
export const AGE_FLOOR = 18;
export const AGE_CEILING = 99;
