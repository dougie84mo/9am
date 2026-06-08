import * as Location from 'expo-location';
import tzlookup from 'tz-lookup';

/**
 * Timezone resolution for the server-side 9–10am window.
 *
 * The trusted check (`enforce_photo_window`) runs in the timezone stored on the
 * user's profile. We want that to reflect where the user actually *is* — so a
 * traveler is judged in their current local morning — which is what location
 * services give us. We map GPS coordinates to an IANA zone offline with
 * `tz-lookup` (no network, no API key), and fall back to the device's OS clock
 * timezone whenever location is denied or unavailable.
 */

/** Device's IANA timezone from the OS clock settings (always available). */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Resolved once per session so profile edits don't re-prompt for location.
let cached: string | null = null;

/** Best-effort IANA timezone: physical location first, OS clock as fallback. */
export async function resolveTimezone(): Promise<string> {
  if (cached) return cached;
  const fallback = deviceTimezone();
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return (cached = fallback);

    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    if (!pos) return (cached = fallback);

    const tz = tzlookup(pos.coords.latitude, pos.coords.longitude);
    return (cached = tz || fallback);
  } catch {
    // Permission prompt dismissed, location off, lookup failure, etc.
    return (cached = fallback);
  }
}

/** Force the next resolveTimezone() to re-detect (e.g. after travel). */
export function clearTimezoneCache(): void {
  cached = null;
}
