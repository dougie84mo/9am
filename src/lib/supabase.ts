import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client for 9am.
 *
 * Configure by setting these in a `.env` file (see `.env.example`). Expo inlines
 * any `EXPO_PUBLIC_`-prefixed variable into the JS bundle at build time, so they
 * are safe to read from `process.env`. Use the *anon/publishable* key only —
 * never the service_role key in client code.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when both env vars are present. The app falls back to its local,
 *  offline mock when this is false, so it still runs before you connect. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL-based session detection in a native app.
        detectSessionInUrl: false,
      },
    })
  : null;

/** Throwing accessor for code paths that require the backend. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env.',
    );
  }
  return supabase;
}
