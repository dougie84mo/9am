import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversations, Match, UserProfile } from '../types';

const KEYS = {
  profile: '@9am/profile',
  matches: '@9am/matches',
  seen: '@9am/seen', // candidate ids the user has already swiped
  conversations: '@9am/conversations',
} as const;

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function loadMatches(): Promise<Match[]> {
  const raw = await AsyncStorage.getItem(KEYS.matches);
  return raw ? (JSON.parse(raw) as Match[]) : [];
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.matches, JSON.stringify(matches));
}

export async function loadSeen(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.seen);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function saveSeen(seen: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.seen, JSON.stringify(seen));
}

export async function loadConversations(): Promise<Conversations> {
  const raw = await AsyncStorage.getItem(KEYS.conversations);
  return raw ? (JSON.parse(raw) as Conversations) : {};
}

export async function saveConversations(convos: Conversations): Promise<void> {
  await AsyncStorage.setItem(KEYS.conversations, JSON.stringify(convos));
}

/** Wipe everything — used by the "Start over" dev/profile action. */
export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.profile,
    KEYS.matches,
    KEYS.seen,
    KEYS.conversations,
  ]);
}
