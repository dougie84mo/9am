import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { compatibilityScore } from '../lib/interests';
import { candidateVisible } from '../lib/matching';
import { MOCK_CANDIDATES } from '../lib/mockProfiles';
import { AGE_CEILING, AGE_FLOOR } from '../lib/profileFields';
import {
  clearAll,
  loadConversations,
  loadMatches,
  loadProfile,
  loadSeen,
  saveConversations,
  saveMatches,
  saveProfile,
  saveSeen,
} from '../lib/storage';
import type {
  Candidate,
  ChatMessage,
  Conversations,
  Match,
  Photo,
  SwipeDirection,
  UserProfile,
} from '../types';

type NewProfileInput = Pick<
  UserProfile,
  | 'name'
  | 'age'
  | 'bio'
  | 'photos'
  | 'interests'
  | 'gender'
  | 'profession'
  | 'childrenStatus'
  | 'prompts'
  | 'preferredGenders'
  | 'ageMin'
  | 'ageMax'
>;

interface AppState {
  ready: boolean;
  profile: UserProfile | null;
  matches: Match[];
  /** Candidates not yet swiped on. */
  deck: Candidate[];
  createProfile: (input: NewProfileInput) => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<
        UserProfile,
        | 'name' | 'age' | 'bio' | 'photos' | 'interests' | 'gender'
        | 'profession' | 'childrenStatus' | 'prompts' | 'preferredGenders'
        | 'ageMin' | 'ageMax'
      >
    >,
  ) => Promise<void>;
  /** Returns true when the like resulted in a match. */
  swipe: (candidateId: string, direction: SwipeDirection) => Promise<boolean>;
  /** Number of swipes that can still be undone (0 = nothing to undo). */
  undoCount: number;
  /** Reverse the most recent swipe: un-sees the candidate and, if that swipe
   *  created a match, removes the match and any messages. Returns the restored
   *  candidate id, or null when there's nothing to undo. */
  undoLast: () => string | null;
  /** Bumped whenever the deck is reset, so the swipe screen can re-snapshot. */
  deckEpoch: number;
  /** Bring everyone back into the deck (clears who you've seen, keeps matches). */
  resetDeck: () => void;
  candidateById: (id: string) => Candidate | undefined;
  conversations: Conversations;
  messagesFor: (candidateId: string) => ChatMessage[];
  sendMessage: (candidateId: string, text: string) => void;
  resetEverything: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

/** Deterministic-ish "did they like you back?" so demos feel alive without a
 *  backend. Roughly 65% of likes match. */
function likesBack(candidateId: string, seenCount: number): boolean {
  const seed = candidateId
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), seenCount);
  return seed % 3 !== 0;
}

function makeId(prefix = 'u'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Canned replies so a conversation feels alive without a backend. Picked by
 *  how many times the other person has already replied. */
const CANNED_REPLIES = [
  'morning! ☕️ ok this is way better than fake gym selfies haha',
  'honestly love that everyone here looks like an actual human',
  'so what does your 9am usually look like?',
  'ha, same. coffee first, words later',
  'we should grab a coffee sometime — at a reasonable hour 😄',
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversations>({});
  // Most-recent-last stack of swipes, kept in memory only, so the deck can undo.
  const [history, setHistory] = useState<
    { candidateId: string; direction: SwipeDirection; matched: boolean }[]
  >([]);
  const [deckEpoch, setDeckEpoch] = useState(0);

  useEffect(() => {
    (async () => {
      const [p, m, s, c] = await Promise.all([
        loadProfile(),
        loadMatches(),
        loadSeen(),
        loadConversations(),
      ]);
      // Backfill fields added after a profile may have been first saved.
      setProfile(
        p
          ? {
              ...p,
              interests: p.interests ?? [],
              gender: p.gender ?? null,
              profession: p.profession ?? '',
              childrenStatus: p.childrenStatus ?? null,
              prompts: p.prompts ?? [],
              preferredGenders: p.preferredGenders ?? [],
              ageMin: p.ageMin ?? AGE_FLOOR,
              ageMax: p.ageMax ?? AGE_CEILING,
            }
          : null,
      );
      setMatches(m);
      setSeen(s);
      setConversations(c);
      setReady(true);
    })();
  }, []);

  const createProfile = useCallback(async (input: NewProfileInput) => {
    const next: UserProfile = {
      id: makeId(),
      name: input.name.trim(),
      age: input.age,
      bio: input.bio.trim(),
      photos: input.photos,
      interests: input.interests,
      gender: input.gender,
      profession: input.profession.trim(),
      childrenStatus: input.childrenStatus,
      prompts: input.prompts,
      preferredGenders: input.preferredGenders,
      ageMin: input.ageMin,
      ageMax: input.ageMax,
      createdAt: new Date().toISOString(),
    };
    setProfile(next);
    await saveProfile(next);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<UserProfile, 'name' | 'age' | 'bio' | 'photos'>>) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      await saveProfile(next);
    },
    [profile],
  );

  const swipe = useCallback(
    async (candidateId: string, direction: SwipeDirection): Promise<boolean> => {
      const nextSeen = seen.includes(candidateId) ? seen : [...seen, candidateId];
      setSeen(nextSeen);
      void saveSeen(nextSeen);

      const matched = direction === 'like' && likesBack(candidateId, nextSeen.length);
      if (matched) {
        const match: Match = { candidateId, matchedAt: new Date().toISOString() };
        const nextMatches = [match, ...matches.filter((m) => m.candidateId !== candidateId)];
        setMatches(nextMatches);
        void saveMatches(nextMatches);
      }
      setHistory((h) => [...h, { candidateId, direction, matched }]);
      return matched;
    },
    [seen, matches],
  );

  const undoLast = useCallback((): string | null => {
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));

    setSeen((prev) => {
      const next = prev.filter((id) => id !== last.candidateId);
      void saveSeen(next);
      return next;
    });

    if (last.matched) {
      setMatches((prev) => {
        const next = prev.filter((m) => m.candidateId !== last.candidateId);
        void saveMatches(next);
        return next;
      });
      setConversations((prev) => {
        if (!prev[last.candidateId]) return prev;
        const next = { ...prev };
        delete next[last.candidateId];
        void saveConversations(next);
        return next;
      });
    }
    return last.candidateId;
  }, [history]);

  const resetDeck = useCallback(() => {
    setHistory([]);
    setSeen([]);
    void saveSeen([]);
    setDeckEpoch((e) => e + 1);
  }, []);

  // Build the deck in two passes: first a hard mutual-preference filter (gender +
  // age), then rank the survivors by shared interests (stable sort keeps ties in
  // seed order). Someone outside your preferences never appears, however many
  // interests overlap.
  const deck = useMemo(() => {
    const mine = profile?.interests ?? [];
    return MOCK_CANDIDATES.filter((c) => !seen.includes(c.id))
      .filter((c) => !profile || candidateVisible(profile, c))
      .map((c) => ({ c, score: compatibilityScore(mine, c.interests) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.c);
  }, [seen, profile]);

  const candidateById = useCallback(
    (id: string) => MOCK_CANDIDATES.find((c) => c.id === id),
    [],
  );

  const messagesFor = useCallback(
    (candidateId: string) => conversations[candidateId] ?? [],
    [conversations],
  );

  const appendMessage = useCallback((candidateId: string, message: ChatMessage) => {
    setConversations((prev) => {
      const next = {
        ...prev,
        [candidateId]: [...(prev[candidateId] ?? []), message],
      };
      void saveConversations(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    (candidateId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      appendMessage(candidateId, {
        id: makeId('m'),
        from: 'me',
        text: trimmed,
        sentAt: new Date().toISOString(),
      });

      // Simulated reply so the conversation feels two-sided (no backend yet).
      const replyIndex =
        (conversations[candidateId]?.filter((m) => m.from === 'them').length ?? 0) %
        CANNED_REPLIES.length;
      setTimeout(() => {
        appendMessage(candidateId, {
          id: makeId('m'),
          from: 'them',
          text: CANNED_REPLIES[replyIndex],
          sentAt: new Date().toISOString(),
        });
      }, 1300);
    },
    [appendMessage, conversations],
  );

  const resetEverything = useCallback(async () => {
    await clearAll();
    setProfile(null);
    setMatches([]);
    setSeen([]);
    setConversations({});
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      profile,
      matches,
      deck,
      createProfile,
      updateProfile,
      swipe,
      undoCount: history.length,
      undoLast,
      deckEpoch,
      resetDeck,
      candidateById,
      conversations,
      messagesFor,
      sendMessage,
      resetEverything,
    }),
    [
      ready,
      profile,
      matches,
      deck,
      createProfile,
      updateProfile,
      swipe,
      history.length,
      undoLast,
      deckEpoch,
      resetDeck,
      candidateById,
      conversations,
      messagesFor,
      sendMessage,
      resetEverything,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
