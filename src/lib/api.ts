/**
 * Remote data-access layer for 9am (Supabase).
 *
 * This is the turnkey backend layer. It is written and type-checked but not yet
 * wired into the UI — the app currently runs on its local offline mock
 * (AppContext). When you connect a project (see BACKEND.md), swap AppContext's
 * calls for these. Every function assumes `requireSupabase()` succeeds.
 *
 * NOTE on photo upload: React Native's Blob upload support varies by version. If
 * `uploadPhoto` misbehaves once connected, switch to the base64 path
 * (expo-file-system `readAsStringAsync` + `base64-arraybuffer` decode) — left as
 * a comment inline.
 */
import { requireSupabase } from './supabase';
import type { Candidate, ChatMessage, Photo } from '../types';

// ----- helpers --------------------------------------------------------------

/** The device's IANA timezone, stored on the profile so the server can judge
 *  the 8–10am window in the user's local time. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function uuid(): string {
  // RN-safe random id for storage paths (not security-sensitive).
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ----- auth ------------------------------------------------------------------

export async function signUp(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await requireSupabase().auth.getUser();
  return data.user?.id ?? null;
}

// ----- profile ---------------------------------------------------------------

export async function upsertProfile(input: {
  name: string;
  age: number;
  bio: string;
}): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const { error } = await sb.from('profiles').upsert({
    id: uid,
    name: input.name,
    age: input.age,
    bio: input.bio,
    timezone: deviceTimezone(),
  });
  if (error) throw error;
}

// ----- photos ----------------------------------------------------------------

/**
 * Uploads a freshly-captured photo to storage and records it. The DB trigger
 * stamps `taken_at` with the server clock and REJECTS the insert if the server
 * time is outside 8–10am in the user's timezone — that's the tamper-proof gate.
 * Throws on rejection; surface the message to the user.
 */
export async function uploadPhoto(localUri: string, position = 0): Promise<Photo> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  const path = `${uid}/${uuid()}.jpg`;

  // Blob path (simplest). If this proves flaky in RN, replace the next 3 lines:
  //   const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  //   const body = decode(base64);  // from 'base64-arraybuffer'
  const res = await fetch(localUri);
  const blob = await res.blob();

  const up = await sb.storage.from('photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (up.error) throw up.error;

  // Insert the row — server enforces the 8–10am window and stamps taken_at.
  const { data, error } = await sb
    .from('photos')
    .insert({ user_id: uid, storage_path: path, position })
    .select('storage_path, taken_at')
    .single();
  if (error) {
    // Roll back the orphaned upload so it doesn't linger.
    await sb.storage.from('photos').remove([path]);
    throw error;
  }

  const publicUrl = sb.storage.from('photos').getPublicUrl(data.storage_path).data
    .publicUrl;
  return { uri: publicUrl, takenAt: data.taken_at };
}

// ----- deck / swipes ---------------------------------------------------------

interface ProfileRow {
  id: string;
  name: string;
  age: number;
  bio: string;
}
interface PhotoRow {
  user_id: string;
  storage_path: string;
  taken_at: string;
  position: number;
}

/** Profiles the user hasn't swiped yet, with their photos, as Candidates. */
export async function fetchDeck(): Promise<Candidate[]> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  const swiped = await sb.from('swipes').select('swipee').eq('swiper', uid);
  if (swiped.error) throw swiped.error;
  const excludeIds = [uid, ...(swiped.data ?? []).map((r) => r.swipee as string)];

  const profiles = await sb
    .from('profiles')
    .select('id, name, age, bio')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .neq('name', '')
    .limit(50);
  if (profiles.error) throw profiles.error;

  const ids = (profiles.data as ProfileRow[]).map((p) => p.id);
  if (ids.length === 0) return [];

  const photos = await sb
    .from('photos')
    .select('user_id, storage_path, taken_at, position')
    .in('user_id', ids)
    .order('position', { ascending: true });
  if (photos.error) throw photos.error;

  const byUser = new Map<string, Photo[]>();
  for (const row of photos.data as PhotoRow[]) {
    const url = sb.storage.from('photos').getPublicUrl(row.storage_path).data.publicUrl;
    const list = byUser.get(row.user_id) ?? [];
    list.push({ uri: url, takenAt: row.taken_at });
    byUser.set(row.user_id, list);
  }

  return (profiles.data as ProfileRow[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      bio: p.bio,
      distance: 0, // distance would come from geo; not modelled yet
      // TODO: persist + select these when the backend gains them.
      interests: [],
      gender: 'Nonbinary' as const,
      profession: '',
      childrenStatus: null,
      prompts: [],
      preferredGenders: [],
      ageMin: 18,
      ageMax: 99,
      photos: byUser.get(p.id) ?? [],
    }))
    .filter((c) => c.photos.length > 0);
}

/** Records a swipe; returns true if it produced a mutual match. */
export async function swipe(
  swipeeId: string,
  direction: 'like' | 'nope',
): Promise<boolean> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  const ins = await sb.from('swipes').insert({ swiper: uid, swipee: swipeeId, direction });
  if (ins.error) throw ins.error;

  if (direction !== 'like') return false;

  // The DB trigger creates the match row on a mutual like; check for it.
  const [a, b] = uid < swipeeId ? [uid, swipeeId] : [swipeeId, uid];
  const match = await sb
    .from('matches')
    .select('id')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle();
  if (match.error) throw match.error;
  return Boolean(match.data);
}

// ----- matches & messages ----------------------------------------------------

export interface MatchView {
  matchId: string;
  candidate: Candidate;
  matchedAt: string;
}

export async function fetchMatches(): Promise<MatchView[]> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  const matches = await sb
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .order('created_at', { ascending: false });
  if (matches.error) throw matches.error;

  const rows = matches.data as {
    id: string;
    user_a: string;
    user_b: string;
    created_at: string;
  }[];

  const result: MatchView[] = [];
  for (const m of rows) {
    const otherId = m.user_a === uid ? m.user_b : m.user_a;
    const prof = await sb
      .from('profiles')
      .select('id, name, age, bio')
      .eq('id', otherId)
      .single();
    if (prof.error) continue;
    const ph = await sb
      .from('photos')
      .select('user_id, storage_path, taken_at, position')
      .eq('user_id', otherId)
      .order('position', { ascending: true });
    const photos: Photo[] = (ph.data as PhotoRow[] | null ?? []).map((row) => ({
      uri: sb.storage.from('photos').getPublicUrl(row.storage_path).data.publicUrl,
      takenAt: row.taken_at,
    }));
    const p = prof.data as ProfileRow;
    result.push({
      matchId: m.id,
      matchedAt: m.created_at,
      candidate: {
        id: p.id,
        name: p.name,
        age: p.age,
        bio: p.bio,
        distance: 0,
        // TODO: populate from the backend once these columns exist.
        interests: [],
        gender: 'Nonbinary',
        profession: '',
        childrenStatus: null,
        prompts: [],
        preferredGenders: [],
        ageMin: 18,
        ageMax: 99,
        photos,
      },
    });
  }
  return result;
}

export async function fetchMessages(matchId: string): Promise<ChatMessage[]> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  const { data, error } = await sb
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id as string,
    from: (m.sender as string) === uid ? 'me' : 'them',
    text: m.body as string,
    sentAt: m.created_at as string,
  }));
}

export async function sendMessage(matchId: string, body: string): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const { error } = await sb
    .from('messages')
    .insert({ match_id: matchId, sender: uid, body: body.trim() });
  if (error) throw error;
}

/** Live message stream for a conversation. Returns an unsubscribe function. */
export function subscribeMessages(
  matchId: string,
  onInsert: (row: { id: string; sender: string; body: string; created_at: string }) => void,
): () => void {
  const sb = requireSupabase();
  const channel = sb
    .channel(`messages:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      (payload) => onInsert(payload.new as any),
    )
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
