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
import { isDevBypassEnabled, setDevBypass } from '../lib/time';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  Candidate,
  ChatMessage,
  Conversations,
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
  /** False only if no Supabase project is configured (missing .env). */
  configured: boolean;
  /** Is there a signed-in session. */
  authed: boolean;
  profile: UserProfile | null;
  matches: MatchEntry[];
  deck: Candidate[];

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;

  createProfile: (input: NewProfileInput) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  /** Upload a freshly-captured photo (server enforces the 9–10am window and may
   *  reject it; admins bypass it). */
  uploadCapturedPhoto: (localUri: string, position?: number) => Promise<Photo>;
  removePhoto: (uri: string) => Promise<void>;

  /** Returns true when the like resulted in a match. */
  swipe: (candidateId: string, direction: SwipeDirection) => Promise<boolean>;
  undoCount: number;
  undoLast: () => string | null;
  deckEpoch: number;
  resetDeck: () => void;

  // developer tools (admin-gated in the UI)
  isAdmin: boolean;
  devModeEnabled: boolean;
  setDevMode: (on: boolean) => void;
  /** The client-side 9–10am camera bypass (dev only). */
  windowBypass: boolean;
  setWindowBypass: (on: boolean) => void;

  messagesFor: (conversationId: string) => ChatMessage[];
  sendMessage: (conversationId: string, text: string) => void;
  /** Open a conversation's live stream. Returns an unsubscribe fn. */
  subscribeToConversation: (conversationId: string) => () => void;

  /** Sign out (the "start over" of backend mode). */
  resetEverything: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchEntries, setMatchEntries] = useState<MatchEntry[]>([]);
  const [deckCards, setDeckCards] = useState<Candidate[]>([]);
  const [conversations, setConversations] = useState<Conversations>({});
  // Candidate ids swiped this session (removes them from the deck immediately).
  const [seen, setSeen] = useState<string[]>([]);
  // Ordered swipe history for undo.
  const [history, setHistory] = useState<string[]>([]);
  const [deckEpoch, setDeckEpoch] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [windowBypass, setWindowBypassState] = useState(isDevBypassEnabled());

  const userIdRef = useRef<string | null>(null);

  const loadBackendData = useCallback(async () => {
    const [p, d, m, admin] = await Promise.all([
      api.getMyProfile(),
      api.fetchDeck(),
      api.fetchMatches(),
      api.isAdminUser(),
    ]);
    setIsAdmin(admin);
    setProfile(p);
    setDeckCards(d);
    setMatchEntries(
      m.map((mv) => ({
        conversationId: mv.matchId,
        candidate: mv.candidate,
        matchedAt: mv.matchedAt,
      })),
    );
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      return;
    }
    let unsubAuth: (() => void) | undefined;
    (async () => {
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
          setDeckCards([]);
          setMatchEntries([]);
          setConversations({});
          setSeen([]);
          setHistory([]);
          setIsAdmin(false);
          setDevModeEnabled(false);
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
    await api.upsertProfile(profileWrite(input));
    setProfile(await api.getMyProfile());
    setDeckCards(await api.fetchDeck());
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      await api.upsertProfile(profileWrite(next));
    },
    [profile],
  );

  const uploadCapturedPhoto = useCallback(
    (localUri: string, position = 0): Promise<Photo> => api.uploadPhoto(localUri, position),
    [],
  );

  const removePhoto = useCallback(async (uri: string) => {
    await api.deletePhoto(uri);
  }, []);

  // ---- deck + swipe -------------------------------------------------------
  const deck = useMemo(() => {
    return deckCards
      .filter((c) => !seen.includes(c.id))
      .filter((c) => !profile || candidateVisible(profile, c))
      .map((c) => ({ c, score: compatibilityScore(profile?.interests ?? [], c.interests) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.c);
  }, [seen, profile, deckCards]);

  const swipe = useCallback(
    async (candidateId: string, direction: SwipeDirection): Promise<boolean> => {
      setSeen((prev) => (prev.includes(candidateId) ? prev : [...prev, candidateId]));
      setHistory((h) => [...h, candidateId]);
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
    },
    [],
  );

  const undoLast = useCallback((): string | null => {
    if (history.length === 0) return null;
    const undoneId = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setSeen((prev) => prev.filter((id) => id !== undoneId));
    void api.deleteSwipe(undoneId);
    return undoneId;
  }, [history]);

  const resetDeck = useCallback(() => {
    setHistory([]);
    setSeen([]);
    void (async () => {
      await api.clearMySwipes();
      setDeckCards(await api.fetchDeck());
    })();
    setDeckEpoch((e) => e + 1);
  }, []);

  const setDevMode = useCallback((on: boolean) => setDevModeEnabled(on), []);
  const setWindowBypass = useCallback((on: boolean) => {
    setDevBypass(on);
    setWindowBypassState(on);
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
      return { ...prev, [conversationId]: [...list, message] };
    });
  }, []);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Realtime echoes the insert back (including our own) and appends it.
    void api.sendMessage(conversationId, trimmed);
  }, []);

  const subscribeToConversation = useCallback(
    (conversationId: string): (() => void) => {
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
    await api.signOut();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
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
      undoCount: history.length,
      undoLast,
      deckEpoch,
      resetDeck,
      isAdmin,
      devModeEnabled,
      setDevMode,
      windowBypass,
      setWindowBypass,
      messagesFor,
      sendMessage,
      subscribeToConversation,
      resetEverything,
    }),
    [
      ready, authed, profile, matchEntries, deck, signIn, signUp, signOut,
      createProfile, updateProfile, uploadCapturedPhoto, removePhoto, swipe,
      history.length, undoLast, deckEpoch, resetDeck, isAdmin, devModeEnabled,
      setDevMode, windowBypass, setWindowBypass, messagesFor, sendMessage,
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

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
