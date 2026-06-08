import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '../lib/api';
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
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Candidate,
  ChatMessage,
  Conversations,
  Match,
  MatchEntry,
  Photo,
  SwipeDirection,
  UserProfile,
} from '../types';

type NewProfileInput = Pick<
  UserProfile,
  | 'name' | 'age' | 'bio' | 'photos' | 'interests' | 'gender' | 'profession'
  | 'childrenStatus' | 'prompts' | 'preferredGenders' | 'ageMin' | 'ageMax'
>;

type ProfilePatch = Partial<
  Pick<
    UserProfile,
    | 'name' | 'age' | 'bio' | 'photos' | 'interests' | 'gender' | 'profession'
    | 'childrenStatus' | 'prompts' | 'preferredGenders' | 'ageMin' | 'ageMax'
  >
>;

interface AppState {
  ready: boolean;
  /** True when a Supabase project is configured (backend mode). */
  backendEnabled: boolean;
  /** Backend mode: is there a signed-in session. Mock mode: always true. */
  authed: boolean;
  profile: UserProfile | null;
  matches: MatchEntry[];
  deck: Candidate[];

  // auth (backend mode). Resolve to the session (or null) for sign-up.
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;

  createProfile: (input: NewProfileInput) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  /** Turn a freshly-captured local photo into a stored Photo (uploads in backend
   *  mode, where the server enforces the 8–10am window and may reject it). */
  uploadCapturedPhoto: (localUri: string, position?: number) => Promise<Photo>;
  /** Remove a stored photo (deletes from the backend when configured). */
  removePhoto: (uri: string) => Promise<void>;

  /** Returns true when the like resulted in a match. */
  swipe: (candidateId: string, direction: SwipeDirection) => Promise<boolean>;
  undoCount: number;
  undoLast: () => string | null;
  deckEpoch: number;
  resetDeck: () => void;

  messagesFor: (conversationId: string) => ChatMessage[];
  sendMessage: (conversationId: string, text: string) => void;
  /** Open a conversation's live stream. Returns an unsubscribe fn. */
  subscribeToConversation: (conversationId: string) => () => void;

  resetEverything: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const BACKEND = isSupabaseConfigured;

/** Deterministic-ish "did they like you back?" so the mock feels alive without a
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

/** Canned replies so a mock conversation feels two-sided. */
const CANNED_REPLIES = [
  'morning! ☕️ ok this is way better than fake gym selfies haha',
  'honestly love that everyone here looks like an actual human',
  'so what does your 9am usually look like?',
  'ha, same. coffee first, words later',
  'we should grab a coffee sometime — at a reasonable hour 😄',
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(!BACKEND); // mock: always "authed"
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchEntries, setMatchEntries] = useState<MatchEntry[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversations>({});
  const [backendDeck, setBackendDeck] = useState<Candidate[]>([]);
  const [deckEpoch, setDeckEpoch] = useState(0);

  // Mock-only: persisted matches + undo history.
  const [mockMatches, setMockMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<
    { candidateId: string; direction: SwipeDirection; matched: boolean }[]
  >([]);

  const userIdRef = useRef<string | null>(null);

  // ---- initial load + auth wiring ----------------------------------------
  const loadBackendData = useCallback(async () => {
    const [p, d, m] = await Promise.all([
      api.getMyProfile(),
      api.fetchDeck(),
      api.fetchMatches(),
    ]);
    setProfile(p);
    setBackendDeck(d);
    setMatchEntries(
      m.map((mv) => ({
        conversationId: mv.matchId,
        candidate: mv.candidate,
        matchedAt: mv.matchedAt,
      })),
    );
  }, []);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    (async () => {
      if (!BACKEND || !supabase) {
        const [p, m, s, c] = await Promise.all([
          loadProfile(),
          loadMatches(),
          loadSeen(),
          loadConversations(),
        ]);
        const restored = p ? backfillProfile(p) : null;
        setProfile(restored);
        setMockMatches(m);
        setMatchEntries(mockEntries(m));
        setSeen(s);
        setConversations(c);
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      userIdRef.current = data.session?.user.id ?? null;
      const signedIn = Boolean(data.session);
      setAuthed(signedIn);
      if (signedIn) await loadBackendData();
      setReady(true);

      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        userIdRef.current = session?.user.id ?? null;
        const nowSignedIn = Boolean(session);
        setAuthed(nowSignedIn);
        if (nowSignedIn) {
          void loadBackendData();
        } else {
          setProfile(null);
          setBackendDeck([]);
          setMatchEntries([]);
          setConversations({});
          setSeen([]);
        }
      });
      unsubAuth = () => sub.data.subscription.unsubscribe();
    })();
    return () => unsubAuth?.();
  }, [loadBackendData]);

  // ---- auth ---------------------------------------------------------------
  const signIn = useCallback(async (email: string, password: string) => {
    await api.signIn(email, password);
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const data = await api.signUp(email, password);
    return (data as { session?: unknown } | null)?.session ?? null;
  }, []);
  const signOut = useCallback(async () => {
    await api.signOut();
  }, []);

  // ---- profile ------------------------------------------------------------
  const createProfile = useCallback(async (input: NewProfileInput) => {
    if (BACKEND) {
      await api.upsertProfile(profileWrite(input));
      const p = await api.getMyProfile();
      setProfile(p);
      setBackendDeck(await api.fetchDeck());
      return;
    }
    const next: UserProfile = {
      id: makeId(),
      ...input,
      name: input.name.trim(),
      profession: input.profession.trim(),
      bio: input.bio.trim(),
      createdAt: new Date().toISOString(),
    };
    setProfile(next);
    await saveProfile(next);
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      if (BACKEND) {
        await api.upsertProfile(profileWrite(next));
      } else {
        await saveProfile(next);
      }
    },
    [profile],
  );

  const uploadCapturedPhoto = useCallback(
    async (localUri: string, position = 0): Promise<Photo> => {
      if (BACKEND) return api.uploadPhoto(localUri, position);
      return { uri: localUri, takenAt: new Date().toISOString() };
    },
    [],
  );

  const removePhoto = useCallback(async (uri: string) => {
    if (BACKEND) await api.deletePhoto(uri);
  }, []);

  // ---- deck + swipe -------------------------------------------------------
  const deck = useMemo(() => {
    const source = BACKEND ? backendDeck : MOCK_CANDIDATES;
    return source
      .filter((c) => !seen.includes(c.id))
      .filter((c) => !profile || candidateVisible(profile, c))
      .map((c) => ({ c, score: compatibilityScore(profile?.interests ?? [], c.interests) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.c);
  }, [seen, profile, backendDeck]);

  const swipe = useCallback(
    async (candidateId: string, direction: SwipeDirection): Promise<boolean> => {
      const nextSeen = seen.includes(candidateId) ? seen : [...seen, candidateId];
      setSeen(nextSeen);

      if (BACKEND) {
        const matched = await api.swipe(candidateId, direction);
        if (matched) {
          const m = await api.fetchMatches();
          setMatchEntries(
            m.map((mv) => ({
              conversationId: mv.matchId,
              candidate: mv.candidate,
              matchedAt: mv.matchedAt,
            })),
          );
        }
        return matched;
      }

      void saveSeen(nextSeen);
      const matched = direction === 'like' && likesBack(candidateId, nextSeen.length);
      if (matched) {
        const match: Match = { candidateId, matchedAt: new Date().toISOString() };
        const nextMatches = [match, ...mockMatches.filter((m) => m.candidateId !== candidateId)];
        setMockMatches(nextMatches);
        setMatchEntries(mockEntries(nextMatches));
        void saveMatches(nextMatches);
      }
      setHistory((h) => [...h, { candidateId, direction, matched }]);
      return matched;
    },
    [seen, mockMatches],
  );

  const undoLast = useCallback((): string | null => {
    if (BACKEND || history.length === 0) return null;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setSeen((prev) => {
      const next = prev.filter((id) => id !== last.candidateId);
      void saveSeen(next);
      return next;
    });
    if (last.matched) {
      setMockMatches((prev) => {
        const next = prev.filter((m) => m.candidateId !== last.candidateId);
        void saveMatches(next);
        setMatchEntries(mockEntries(next));
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
    if (BACKEND) {
      void api.fetchDeck().then(setBackendDeck);
    } else {
      void saveSeen([]);
    }
    setDeckEpoch((e) => e + 1);
  }, []);

  // ---- conversations ------------------------------------------------------
  const messagesFor = useCallback(
    (conversationId: string) => conversations[conversationId] ?? [],
    [conversations],
  );

  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((prev) => {
      const list = prev[conversationId] ?? [];
      if (list.some((m) => m.id === message.id)) return prev;
      const next = { ...prev, [conversationId]: [...list, message] };
      if (!BACKEND) void saveConversations(next);
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (BACKEND) {
        // Realtime echoes the insert back (including our own) and appends it.
        void api.sendMessage(conversationId, trimmed);
        return;
      }

      appendMessage(conversationId, {
        id: makeId('m'),
        from: 'me',
        text: trimmed,
        sentAt: new Date().toISOString(),
      });
      const replyIndex =
        (conversations[conversationId]?.filter((m) => m.from === 'them').length ?? 0) %
        CANNED_REPLIES.length;
      setTimeout(() => {
        appendMessage(conversationId, {
          id: makeId('m'),
          from: 'them',
          text: CANNED_REPLIES[replyIndex],
          sentAt: new Date().toISOString(),
        });
      }, 1300);
    },
    [appendMessage, conversations],
  );

  const subscribeToConversation = useCallback(
    (conversationId: string): (() => void) => {
      if (!BACKEND) return () => {};
      void api.fetchMessages(conversationId).then((msgs) => {
        setConversations((prev) => ({ ...prev, [conversationId]: msgs }));
      });
      return api.subscribeMessages(conversationId, (row) => {
        appendMessage(conversationId, {
          id: row.id,
          from: row.sender === userIdRef.current ? 'me' : 'them',
          text: row.body,
          sentAt: row.created_at,
        });
      });
    },
    [appendMessage],
  );

  const resetEverything = useCallback(async () => {
    if (BACKEND) {
      await api.signOut();
      return;
    }
    await clearAll();
    setProfile(null);
    setMockMatches([]);
    setMatchEntries([]);
    setSeen([]);
    setConversations({});
    setHistory([]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      backendEnabled: BACKEND,
      authed,
      profile,
      matches: matchEntries,
      deck,
      signIn,
      signUp,
      signOut,
      createProfile,
      updateProfile,
      uploadCapturedPhoto,
      removePhoto,
      swipe,
      undoCount: BACKEND ? 0 : history.length,
      undoLast,
      deckEpoch,
      resetDeck,
      messagesFor,
      sendMessage,
      subscribeToConversation,
      resetEverything,
    }),
    [
      ready, authed, profile, matchEntries, deck, signIn, signUp, signOut,
      createProfile, updateProfile, uploadCapturedPhoto, removePhoto, swipe,
      history.length, undoLast, deckEpoch, resetDeck, messagesFor, sendMessage,
      subscribeToConversation, resetEverything,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Build the column payload for upsertProfile from a profile-ish object. */
function profileWrite(p: NewProfileInput | UserProfile) {
  return {
    name: p.name.trim(),
    age: p.age,
    bio: p.bio.trim(),
    gender: p.gender,
    profession: p.profession.trim(),
    childrenStatus: p.childrenStatus,
    preferredGenders: p.preferredGenders,
    ageMin: p.ageMin,
    ageMax: p.ageMax,
    interests: p.interests,
    prompts: p.prompts,
  };
}

/** Backfill fields added after a mock profile may have first been saved. */
function backfillProfile(p: UserProfile): UserProfile {
  return {
    ...p,
    interests: p.interests ?? [],
    gender: p.gender ?? null,
    profession: p.profession ?? '',
    childrenStatus: p.childrenStatus ?? null,
    prompts: p.prompts ?? [],
    preferredGenders: p.preferredGenders ?? [],
    ageMin: p.ageMin ?? AGE_FLOOR,
    ageMax: p.ageMax ?? AGE_CEILING,
  };
}

/** Mock matches (Match[]) -> MatchEntry[] by looking candidates up in the seed. */
function mockEntries(matches: Match[]): MatchEntry[] {
  return matches
    .map((m) => {
      const candidate = MOCK_CANDIDATES.find((c) => c.id === m.candidateId);
      return candidate
        ? { conversationId: m.candidateId, candidate, matchedAt: m.matchedAt }
        : null;
    })
    .filter((e): e is MatchEntry => e !== null);
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
