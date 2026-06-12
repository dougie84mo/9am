/**
 * Remote data-access layer for 9am (Supabase).
 *
 * This is the turnkey backend layer. It is written and type-checked but not yet
 * wired into the UI — the app currently runs on its local offline mock
 * (AppContext). When you connect a project (see BACKEND.md), swap AppContext's
 * calls for these. Every function assumes `requireSupabase()` succeeds.
 *
 * NOTE on photo upload: `uploadPhoto` reads the captured file with
 * expo-file-system's `File#bytes()` (a Uint8Array) and hands that to storage.
 * The older `fetch(uri).blob()` approach is unreliable on RN and throws
 * "Network request failed" for `file://` URIs — don't reintroduce it.
 */
import { File } from 'expo-file-system';
import { milesBetween } from './geo';
import { resolveLocation } from './location';
import { requireSupabase } from './supabase';
import type { Candidate, ChatMessage, Photo, ProfilePrompt, UserProfile } from '../types';

// ----- helpers --------------------------------------------------------------

function uuid(): string {
  // RN-safe random id for storage paths (not security-sensitive).
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ----- row mapping -----------------------------------------------------------

const PROFILE_COLS =
  'id, name, age, bio, gender, profession, children_status, age_min, age_max, preferred_genders, interests, prompts, latitude, longitude, max_distance, created_at';

interface ProfileRow {
  id: string;
  name: string;
  age: number;
  bio: string;
  gender: string | null;
  profession: string | null;
  children_status: string | null;
  age_min: number | null;
  age_max: number | null;
  preferred_genders: string[] | null;
  interests: string[] | null;
  prompts: ProfilePrompt[] | null;
  latitude: number | null;
  longitude: number | null;
  max_distance: number | null;
  created_at: string;
}

/** The signed-in user's stored coordinates, or null if location isn't set. */
async function myCoords(
  sb: ReturnType<typeof requireSupabase>,
  uid: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const { data } = await sb
    .from('profiles')
    .select('latitude, longitude')
    .eq('id', uid)
    .maybeSingle();
  const row = data as { latitude: number | null; longitude: number | null } | null;
  if (!row || row.latitude == null || row.longitude == null) return null;
  return { latitude: row.latitude, longitude: row.longitude };
}

interface PhotoRow {
  user_id: string;
  storage_path: string;
  taken_at: string;
  position: number;
}

function publicUrl(sb: ReturnType<typeof requireSupabase>, path: string): string {
  // Seeded mock candidates can store a full image URL directly (e.g. an
  // external portrait); real uploads store a storage path we resolve here.
  if (/^https?:\/\//i.test(path)) return path;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

async function fetchPhotosFor(userId: string): Promise<Photo[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('photos')
    .select('user_id, storage_path, taken_at, position')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  if (error) throw error;
  return ((data as PhotoRow[] | null) ?? []).map((row) => ({
    uri: publicUrl(sb, row.storage_path),
    takenAt: row.taken_at,
  }));
}

function rowToCandidate(
  p: ProfileRow,
  photos: Photo[],
  distance: number | null,
): Candidate {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    bio: p.bio,
    distance,
    gender: (p.gender as Candidate['gender']) ?? 'Nonbinary',
    profession: p.profession ?? '',
    childrenStatus: (p.children_status as Candidate['childrenStatus']) ?? null,
    prompts: p.prompts ?? [],
    preferredGenders: (p.preferred_genders ?? []) as Candidate['preferredGenders'],
    ageMin: p.age_min ?? 18,
    ageMax: p.age_max ?? 99,
    interests: p.interests ?? [],
    photos,
  };
}

function rowToProfile(p: ProfileRow, photos: Photo[]): UserProfile {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    bio: p.bio,
    photos,
    interests: p.interests ?? [],
    gender: (p.gender as UserProfile['gender']) ?? null,
    profession: p.profession ?? '',
    childrenStatus: (p.children_status as UserProfile['childrenStatus']) ?? null,
    prompts: p.prompts ?? [],
    preferredGenders: (p.preferred_genders ?? []) as UserProfile['preferredGenders'],
    ageMin: p.age_min ?? 18,
    ageMax: p.age_max ?? 99,
    latitude: p.latitude,
    longitude: p.longitude,
    maxDistance: p.max_distance, // null = Anywhere
    createdAt: p.created_at,
  };
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
  gender: string | null;
  profession: string;
  childrenStatus: string | null;
  preferredGenders: string[];
  ageMin: number;
  ageMax: number;
  interests: string[];
  prompts: ProfilePrompt[];
  maxDistance: number | null;
}): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  // One location fix yields both the timezone (for the 9–10am window) and the
  // device coordinates (for distance). Coords are written only when available,
  // so a denied prompt never wipes a previously-stored location.
  const loc = await resolveLocation();

  const { error } = await sb.from('profiles').upsert({
    id: uid,
    name: input.name,
    age: input.age,
    bio: input.bio,
    gender: input.gender,
    profession: input.profession,
    children_status: input.childrenStatus,
    preferred_genders: input.preferredGenders,
    age_min: input.ageMin,
    age_max: input.ageMax,
    interests: input.interests,
    prompts: input.prompts,
    max_distance: input.maxDistance,
    timezone: loc.timezone,
    ...(loc.coords
      ? { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      : {}),
  });
  if (error) throw error;
}

/** The signed-in user's profile, or null if onboarding isn't done yet (the
 *  signup trigger creates an empty starter row with name ''). */
export async function getMyProfile(): Promise<UserProfile | null> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await sb
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProfileRow | null;
  if (!row || !row.name) return null;
  return rowToProfile(row, await fetchPhotosFor(uid));
}

// ----- photos ----------------------------------------------------------------

/**
 * Uploads a freshly-captured photo to storage and records it. The DB trigger
 * stamps `taken_at` with the server clock and REJECTS the insert if the server
 * time is outside 9–10am in the user's timezone — that's the tamper-proof gate.
 * Throws on rejection; surface the message to the user.
 */
export async function uploadPhoto(localUri: string, position = 0): Promise<Photo> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');

  const path = `${uid}/${uuid()}.jpg`;

  // Read the captured file into bytes via expo-file-system's File API (SDK 54).
  // We deliberately do NOT use `fetch(localUri).blob()` here: on React Native
  // that path is unreliable for `file://` URIs and fails with the opaque
  // "Network request failed". `File#bytes()` returns a Uint8Array, which
  // supabase-js storage uploads natively.
  const bytes = await new File(localUri).bytes();

  const up = await sb.storage.from('photos').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (up.error) throw up.error;

  // Insert the row — server enforces the 9–10am window and stamps taken_at.
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

/** Deletes one of the current user's photos (storage object + row), looked up
 *  by the public URL the app holds. Best-effort; RLS limits it to own photos. */
export async function deletePhoto(uri: string): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('Not signed in');
  const marker = '/photos/';
  const idx = uri.indexOf(marker);
  if (idx === -1) return;
  const path = uri.slice(idx + marker.length);
  await sb.storage.from('photos').remove([path]);
  await sb.from('photos').delete().eq('user_id', uid).eq('storage_path', path);
}

// ----- deck / swipes ---------------------------------------------------------

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
    .select(PROFILE_COLS)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .neq('name', '')
    .limit(50);
  if (profiles.error) throw profiles.error;

  const rows = profiles.data as ProfileRow[];
  const ids = rows.map((p) => p.id);
  if (ids.length === 0) return [];

  const viewer = await myCoords(sb, uid);

  const photos = await sb
    .from('photos')
    .select('user_id, storage_path, taken_at, position')
    .in('user_id', ids)
    .order('position', { ascending: true });
  if (photos.error) throw photos.error;

  const byUser = new Map<string, Photo[]>();
  for (const row of photos.data as PhotoRow[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ uri: publicUrl(sb, row.storage_path), takenAt: row.taken_at });
    byUser.set(row.user_id, list);
  }

  return rows
    .map((p) => rowToCandidate(p, byUser.get(p.id) ?? [], milesBetween(viewer, p)))
    .filter((c) => c.photos.length > 0);
}

/**
 * Dev tool (admin-only on the server): scatter the mock/seed candidates around a
 * center so the distance filter has nearby matches. Returns the number moved.
 */
export async function respoofMockLocations(
  centerLat: number,
  centerLon: number,
  tz: string,
  radiusMiles = 50,
): Promise<number> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('spoof_mock_locations_near', {
    center_lat: centerLat,
    center_lon: centerLon,
    tz,
    radius_miles: radiusMiles,
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

/** Undo a single swipe (used by the deck's undo button). */
export async function deleteSwipe(swipeeId: string): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await sb
    .from('swipes')
    .delete()
    .eq('swiper', uid)
    .eq('swipee', swipeeId);
  if (error) throw error;
}

/** Dev "reset deck": delete all of the current user's swipes so the deck
 *  refills. Leaves any matches that were already created. */
export async function clearMySwipes(): Promise<void> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await sb.from('swipes').delete().eq('swiper', uid);
  if (error) throw error;
}

/** True when the signed-in user is flagged admin in app_metadata (set
 *  server-side; not user-editable). Fetches fresh user data from the server. */
export async function isAdminUser(): Promise<boolean> {
  const { data } = await requireSupabase().auth.getUser();
  return (data.user?.app_metadata as { role?: string } | undefined)?.role === 'admin';
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

  const viewer = await myCoords(sb, uid);

  const result: MatchView[] = [];
  for (const m of rows) {
    const otherId = m.user_a === uid ? m.user_b : m.user_a;
    const prof = await sb
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('id', otherId)
      .single();
    if (prof.error) continue;
    const row = prof.data as ProfileRow;
    result.push({
      matchId: m.id,
      matchedAt: m.created_at,
      candidate: rowToCandidate(row, await fetchPhotosFor(otherId), milesBetween(viewer, row)),
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
