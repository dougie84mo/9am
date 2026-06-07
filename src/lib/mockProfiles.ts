import type { Candidate } from '../types';

/**
 * Seed candidates for the swipe deck.
 *
 * Their photos are remote portraits (randomuser.me) standing in for the kind of
 * unfiltered morning selfies the app is built around — each is stamped with a
 * timestamp inside the 8–10am window so the deck feels on-concept. Genders /
 * preferences are varied so the mutual preference filter (see `matching.ts`) has
 * something real to do.
 */
function morning(min: number): string {
  // Build an ISO timestamp at 09:MM today-ish. The exact day doesn't matter for
  // display; only the clock time is shown.
  const d = new Date();
  d.setHours(9, min, 0, 0);
  return d.toISOString();
}

const portrait = (kind: 'men' | 'women', n: number) =>
  `https://randomuser.me/api/portraits/${kind}/${n}.jpg`;

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Maya',
    age: 27,
    bio: 'Pre-coffee and proud of it. Looking for someone who likes farmers markets and bad puns.',
    distance: 3,
    gender: 'Woman',
    profession: 'Graphic designer',
    childrenStatus: 'Want kids',
    preferredGenders: ['Man'],
    ageMin: 26,
    ageMax: 38,
    prompts: [
      {
        prompt: 'A perfect morning is…',
        answer: 'Coffee in bed before the world wakes up, then a slow farmers-market wander.',
      },
    ],
    interests: [
      'Food:Coffee', 'Food:Farmers markets', 'Food:Brunch', 'Activities:Reading',
      'Activities:Wine tasting', 'Music:Indie', 'Values:Kindness',
    ],
    photos: [
      { uri: portrait('women', 68), takenAt: morning(3) },
      { uri: portrait('women', 65), takenAt: morning(12) },
    ],
  },
  {
    id: 'c2',
    name: 'Theo',
    age: 31,
    bio: 'Runs at sunrise, bakes at sunset. Dog dad. No filter, literally.',
    distance: 5,
    gender: 'Man',
    profession: 'Pastry chef',
    childrenStatus: 'Open to kids',
    preferredGenders: ['Woman'],
    ageMin: 27,
    ageMax: 40,
    prompts: [
      {
        prompt: 'I geek out about…',
        answer: 'Sourdough hydration ratios. Ask me about my starter, I dare you.',
      },
    ],
    interests: [
      'Sports:Running', 'Sports:Trail running', 'Food:Baking', 'Activities:Hiking',
      'Values:Animal welfare', 'Values:Health & wellness', 'Music:Folk',
    ],
    photos: [
      { uri: portrait('men', 32), takenAt: morning(7) },
      { uri: portrait('men', 33), takenAt: morning(41) },
    ],
  },
  {
    id: 'c3',
    name: 'Priya',
    age: 29,
    bio: 'Architect. I will judge your bookshelf and your sourdough. Kindly.',
    distance: 2,
    gender: 'Woman',
    profession: 'Architect',
    childrenStatus: "Don't want kids",
    preferredGenders: ['Man', 'Nonbinary'],
    ageMin: 28,
    ageMax: 42,
    prompts: [
      {
        prompt: 'My most controversial opinion is…',
        answer: 'Cereal is a soup. I will not be taking questions.',
      },
      {
        prompt: "We'll get along if…",
        answer: 'You let me reorganize your bookshelf.',
      },
    ],
    interests: [
      'Learning:Architecture', 'Learning:Design', 'Activities:Reading',
      'Food:Baking', 'Activities:Photography', 'Music:Jazz', 'Values:Creativity',
    ],
    photos: [{ uri: portrait('women', 44), takenAt: morning(22) }],
  },
  {
    id: 'c4',
    name: 'Sam',
    age: 26,
    bio: 'Climber, terrible at texting back, great at brunch.',
    distance: 8,
    gender: 'Man',
    profession: 'Physiotherapist',
    childrenStatus: 'Open to kids',
    preferredGenders: ['Woman'],
    ageMin: 24,
    ageMax: 34,
    prompts: [
      {
        prompt: 'My ideal first date is…',
        answer: 'A morning climb, then brunch tacos. Low stakes, high snacks.',
      },
    ],
    interests: [
      'Sports:Rock climbing', 'Sports:Bouldering', 'Food:Brunch',
      'Activities:Camping', 'Activities:Travel', 'Music:Rock', 'Values:Adventure',
    ],
    photos: [
      { uri: portrait('men', 75), takenAt: morning(15) },
      { uri: portrait('men', 76), takenAt: morning(58) },
    ],
  },
  {
    id: 'c5',
    name: 'Noor',
    age: 33,
    bio: 'ER nurse. I have seen worse than your morning hair, promise.',
    distance: 11,
    gender: 'Woman',
    profession: 'ER nurse',
    childrenStatus: 'Have kids',
    preferredGenders: ['Man'],
    ageMin: 30,
    ageMax: 45,
    prompts: [
      {
        prompt: 'The key to my heart is…',
        answer: 'Bring me good coffee and let me sleep in after a night shift.',
      },
    ],
    interests: [
      'Values:Empathy', 'Values:Health & wellness', 'Values:Kindness',
      'Activities:Reading', 'Food:Coffee', 'Sports:Yoga', 'Music:R&B',
    ],
    photos: [{ uri: portrait('women', 12), takenAt: morning(9) }],
  },
  {
    id: 'c6',
    name: 'Leo',
    age: 28,
    bio: 'Jazz, cycling, and an unreasonable number of houseplants.',
    distance: 4,
    gender: 'Man',
    profession: 'Music teacher',
    childrenStatus: 'Want kids',
    preferredGenders: ['Woman', 'Nonbinary'],
    ageMin: 26,
    ageMax: 40,
    prompts: [
      {
        prompt: "I'll never shut up about…",
        answer: 'Jazz vinyl and my 14 houseplants (one has a name).',
      },
    ],
    interests: [
      'Music:Jazz', 'Sports:Cycling', 'Activities:Houseplants',
      'Activities:Gardening', 'Learning:Philosophy', 'Food:Craft beer',
      'Values:Mindfulness',
    ],
    photos: [
      { uri: portrait('men', 11), takenAt: morning(33) },
      { uri: portrait('men', 14), takenAt: morning(50) },
    ],
  },
  {
    id: 'c7',
    name: 'Hana',
    age: 30,
    bio: 'Game designer. Competitive board games are a love language.',
    distance: 6,
    gender: 'Nonbinary',
    profession: 'Game designer',
    childrenStatus: 'Prefer not to say',
    preferredGenders: [],
    ageMin: 25,
    ageMax: 40,
    prompts: [
      {
        prompt: "I'm weirdly competitive about…",
        answer: 'Board games. I will absolutely take that last territory.',
      },
    ],
    interests: [
      'Gaming:Board games', 'Gaming:Tabletop RPGs', 'Gaming:Indie games',
      'Gaming:PC gaming', 'Learning:Design', 'Music:Electronic',
      'Values:Curiosity',
    ],
    photos: [{ uri: portrait('women', 90), takenAt: morning(18) }],
  },
  {
    id: 'c8',
    name: 'Marcus',
    age: 34,
    bio: 'Chef. I cook, you do dishes, we both pretend that is fair.',
    distance: 9,
    gender: 'Man',
    profession: 'Chef',
    childrenStatus: 'Have kids',
    preferredGenders: ['Woman'],
    ageMin: 30,
    ageMax: 46,
    prompts: [
      {
        prompt: 'Green flags I look for…',
        answer: "Does the dishes without being asked. That's the whole list.",
      },
    ],
    interests: [
      'Food:Cooking', 'Food:Fine dining', 'Food:Hot sauce', 'Music:Hip hop',
      'Sports:Boxing', 'Activities:Travel', 'Values:Ambition',
    ],
    photos: [
      { uri: portrait('men', 51), takenAt: morning(5) },
      { uri: portrait('men', 52), takenAt: morning(47) },
    ],
  },
];
