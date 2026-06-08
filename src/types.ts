import type { ChildrenStatus, Gender } from './lib/profileFields';

/** One answered personal-question prompt (Hinge-style). */
export interface ProfilePrompt {
  prompt: string;
  answer: string;
}

/** A single in-app photo. `uri` always points at something captured by the
 *  device camera — never a gallery import. `takenAt` is an ISO timestamp and is
 *  expected to fall inside the 9–10am window. */
export interface Photo {
  uri: string;
  takenAt: string; // ISO 8601 — our in-app capture stamp (device clock)
  /** Raw EXIF DateTimeOriginal from the camera, when available
   *  ("YYYY:MM:DD HH:MM:SS"). Note: also device-clock-based, so it is evidence,
   *  not proof. Real enforcement happens server-side against a trusted clock. */
  exifDateTime?: string;
}

/** Match preferences: who a person wants to see in their deck. */
export interface MatchPreferences {
  /** Genders to show. Empty = no gender constraint (everyone). */
  preferredGenders: Gender[];
  ageMin: number;
  ageMax: number;
}

/** The signed-in user. */
export interface UserProfile extends MatchPreferences {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: Photo[];
  /** Selected interest ids (see `lib/interests.ts`). */
  interests: string[];
  /** null until the user picks one during onboarding. */
  gender: Gender | null;
  profession: string;
  childrenStatus: ChildrenStatus | null;
  prompts: ProfilePrompt[];
  createdAt: string;
}

/** Another person shown in the swipe deck. */
export interface Candidate extends MatchPreferences {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: Photo[];
  /** Selected interest ids (see `lib/interests.ts`), used for matching. */
  interests: string[];
  gender: Gender;
  profession: string;
  childrenStatus: ChildrenStatus | null;
  prompts: ProfilePrompt[];
  /** distance in miles, purely cosmetic */
  distance: number;
}

export type SwipeDirection = 'like' | 'nope';

export interface Match {
  candidateId: string;
  matchedAt: string;
}

/** A match as the UI consumes it: the other person plus the key used to look up
 *  the conversation. `conversationId` is the candidate id in the local mock and
 *  the match id when running against the backend. */
export interface MatchEntry {
  conversationId: string;
  candidate: Candidate;
  matchedAt: string;
}

export interface ChatMessage {
  id: string;
  /** Who sent it, from the signed-in user's point of view. */
  from: 'me' | 'them';
  text: string;
  sentAt: string; // ISO 8601
}

/** All messages for a conversation, keyed by candidate id. */
export type Conversations = Record<string, ChatMessage[]>;
