/**
 * The interest taxonomy that powers profile categories + matching.
 *
 * Seven parent categories, each with a few dozen sub-categories. A user may pick
 * up to {@link MAX_PER_PARENT} sub-categories **from each parent** — so the only
 * cap is per-parent (7), giving a ceiling of 7 × 7 = 49 total, but nothing stops
 * someone maxing out every parent.
 */

export const PARENT_CATEGORIES = [
  'Activities',
  'Sports',
  'Learning',
  'Music',
  'Gaming',
  'Food',
  'Values',
] as const;

export type ParentCategory = (typeof PARENT_CATEGORIES)[number];

/** Per-parent selection limit (not a global limit). */
export const MAX_PER_PARENT = 7;

export const PARENT_EMOJI: Record<ParentCategory, string> = {
  Activities: '🧗',
  Sports: '⚽',
  Learning: '📚',
  Music: '🎵',
  Gaming: '🎮',
  Food: '🍳',
  Values: '🧭',
};

/** Sub-category labels per parent. Labels are unique across the whole taxonomy so
 *  an interest can be referenced unambiguously by `parent:label`. */
const SUBS: Record<ParentCategory, string[]> = {
  Activities: [
    'Hiking', 'Camping', 'Backpacking', 'Travel', 'Road trips', 'Photography',
    'Film photography', 'Painting', 'Drawing', 'Pottery', 'Calligraphy',
    'Gardening', 'Houseplants', 'Reading', 'Creative writing', 'Journaling',
    'Knitting', 'Sewing', 'Woodworking', 'DIY projects', 'Thrifting',
    'Stargazing', 'Birdwatching', 'Fishing', 'Volunteering', 'Dancing',
    'Karaoke', 'Wine tasting',
  ],
  Sports: [
    'Running', 'Trail running', 'Cycling', 'Mountain biking', 'Swimming',
    'Soccer', 'Basketball', 'Tennis', 'Pickleball', 'Volleyball', 'Golf',
    'Baseball', 'Football', 'Rock climbing', 'Bouldering', 'Skiing',
    'Snowboarding', 'Surfing', 'Skateboarding', 'Yoga', 'Pilates',
    'Weightlifting', 'CrossFit', 'Boxing', 'Martial arts', 'Rowing',
    'Kayaking', 'Hockey',
  ],
  Learning: [
    'Languages', 'History', 'Philosophy', 'Psychology', 'Astronomy', 'Physics',
    'Biology', 'Chemistry', 'Mathematics', 'Coding', 'AI & machine learning',
    'Robotics', 'Economics', 'Politics', 'Architecture', 'Design',
    'Public speaking', 'Chess', 'Poetry', 'Documentaries', 'Podcasts',
    'Online courses', 'Neuroscience', 'Entrepreneurship', 'Personal finance',
    'Investing',
  ],
  Music: [
    'Rock', 'Indie', 'Pop', 'Hip hop', 'Rap', 'R&B', 'Jazz', 'Blues',
    'Classical', 'Electronic', 'House', 'Techno', 'Country', 'Folk', 'Metal',
    'Punk', 'Reggae', 'K-pop', 'Latin', 'Afrobeats', 'Playing guitar',
    'Playing piano', 'Singing', 'Producing music', 'Concerts',
    'Music festivals', 'Vinyl collecting', 'DJing',
  ],
  Gaming: [
    'PC gaming', 'Console gaming', 'Mobile gaming', 'RPGs', 'FPS', 'MOBAs',
    'Strategy games', 'Simulation games', 'Indie games', 'Retro games',
    'MMORPGs', 'Fighting games', 'Racing games', 'Sports games',
    'Battle royale', 'Roguelikes', 'Puzzle games', 'Board games',
    'Tabletop RPGs', 'Dungeons & Dragons', 'Card games', 'Trading card games',
    'Esports', 'Streaming', 'Speedrunning', 'VR gaming',
  ],
  Food: [
    'Cooking', 'Baking', 'Coffee', 'Tea', 'Wine', 'Craft beer', 'Cocktails',
    'Vegan food', 'Vegetarian', 'BBQ', 'Sushi', 'Italian food', 'Mexican food',
    'Thai food', 'Indian food', 'Korean food', 'Brunch', 'Street food',
    'Fine dining', 'Farmers markets', 'Meal prep', 'Pizza', 'Desserts',
    'Hot sauce', 'Cheese', 'Food trucks',
  ],
  Values: [
    'Family', 'Friendship', 'Honesty', 'Kindness', 'Empathy', 'Ambition',
    'Adventure', 'Spirituality', 'Faith', 'Mindfulness', 'Sustainability',
    'Environmentalism', 'Social justice', 'Equality', 'Community',
    'Personal growth', 'Health & wellness', 'Work-life balance', 'Creativity',
    'Curiosity', 'Loyalty', 'Independence', 'Generosity', 'Open-mindedness',
    'Optimism', 'Gratitude', 'Animal welfare', 'Lifelong learning',
  ],
};

export interface Interest {
  id: string;
  label: string;
  parent: ParentCategory;
}

/** Stable id for a (parent, label) pair. */
const idFor = (parent: ParentCategory, label: string) => `${parent}:${label}`;

/** Flat list of every interest in the taxonomy. */
export const INTERESTS: Interest[] = PARENT_CATEGORIES.flatMap((parent) =>
  SUBS[parent].map((label) => ({ id: idFor(parent, label), label, parent })),
);

const BY_ID = new Map(INTERESTS.map((i) => [i.id, i]));

export function getInterest(id: string): Interest | undefined {
  return BY_ID.get(id);
}

/** Resolve a list of ids to Interest objects, dropping any unknown ids. */
export function resolveInterests(ids: string[]): Interest[] {
  return ids.map((id) => BY_ID.get(id)).filter((i): i is Interest => Boolean(i));
}

export function interestsForParent(parent: ParentCategory): Interest[] {
  return SUBS[parent].map((label) => BY_ID.get(idFor(parent, label))!);
}

/** How many selected ids belong to a given parent (for the 7-per-parent cap). */
export function countForParent(ids: string[], parent: ParentCategory): number {
  let n = 0;
  for (const id of ids) if (BY_ID.get(id)?.parent === parent) n++;
  return n;
}

/**
 * Search the taxonomy by label for the autocomplete picker. Prefix matches rank
 * ahead of mid-word (substring) matches; within each group, taxonomy order is
 * preserved. Empty/whitespace query returns nothing.
 */
export function searchInterests(query: string): Interest[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: Interest[] = [];
  const substring: Interest[] = [];
  for (const it of INTERESTS) {
    const label = it.label.toLowerCase();
    if (label.startsWith(q)) prefix.push(it);
    else if (label.includes(q)) substring.push(it);
  }
  return [...prefix, ...substring];
}

// ---- Matching -------------------------------------------------------------

/** Interest ids common to both selections, in taxonomy order. */
export function sharedInterestIds(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter((id) => bSet.has(id));
}

export function sharedInterests(a: string[], b: string[]): Interest[] {
  return resolveInterests(sharedInterestIds(a, b));
}

/** Compatibility = number of shared interests. Simple, transparent, and enough
 *  to rank the deck; swap for a weighted model later if needed. */
export function compatibilityScore(a: string[], b: string[]): number {
  return sharedInterestIds(a, b).length;
}
