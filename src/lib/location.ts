import * as Location from 'expo-location';
import tzlookup from 'tz-lookup';

/**
 * Location + timezone resolution.
 *
 * Two things come out of a single GPS fix:
 *  - the **place** (city/region), via reverse geocoding — what we show the user
 *    as "your area", and
 *  - the **IANA timezone**, via an offline `tz-lookup` of the coordinates — used
 *    for the server-side 9–10am window (`enforce_photo_window`).
 *
 * Both fall back gracefully: the timezone to the device's OS clock zone, the
 * place to null, whenever location is denied or unavailable.
 */

/** Device's IANA timezone from the OS clock settings (always available). */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export interface ResolvedLocation {
  /** IANA zone, always present (device-clock zone when GPS is unavailable). */
  timezone: string;
  /** Human-readable place from reverse geocoding ("Brooklyn, New York"), or
   *  null when location is denied/unavailable. */
  place: string | null;
  /** GPS coordinates of the fix, or null when location is denied/unavailable. */
  coords: { latitude: number; longitude: number } | null;
}

// Resolved once per session so profile edits don't re-prompt or re-spin GPS.
let cached: ResolvedLocation | null = null;

/** Turn a reverse-geocoded address into a short "City, Region" label. */
function formatPlace(a: Location.LocationGeocodedAddress): string | null {
  const locality = a.city ?? a.subregion ?? a.district ?? a.name ?? null;
  const region = a.region ?? a.country ?? null;
  if (locality && region && locality !== region) return `${locality}, ${region}`;
  return locality ?? region ?? null;
}

/**
 * Best-effort place + timezone from the physical device location, with the OS
 * clock zone as the timezone fallback. Cached for the session.
 */
export async function resolveLocation(): Promise<ResolvedLocation> {
  if (cached) return cached;
  const fallback: ResolvedLocation = {
    timezone: deviceTimezone(),
    place: null,
    coords: null,
  };
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return (cached = fallback);

    // Prefer a fresh, ~100m-accurate fix; fall back to the last known position.
    const pos =
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null)) ?? (await Location.getLastKnownPositionAsync());
    if (!pos) return (cached = fallback);

    const { latitude, longitude } = pos.coords;

    let timezone = fallback.timezone;
    try {
      timezone = tzlookup(latitude, longitude) || fallback.timezone;
    } catch {
      // tz-lookup throws for out-of-range coords; keep the fallback.
    }

    let place: string | null = null;
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addr) place = formatPlace(addr);
    } catch {
      // Geocoder unavailable/offline — leave place null.
    }

    return (cached = { timezone, place, coords: { latitude, longitude } });
  } catch {
    // Permission prompt dismissed, location off, etc.
    return (cached = fallback);
  }
}

/** Best-effort IANA timezone only (used by the profile write path). */
export async function resolveTimezone(): Promise<string> {
  return (await resolveLocation()).timezone;
}

/** Force the next resolve to re-detect (e.g. after travel or a fresh grant). */
export function clearLocationCache(): void {
  cached = null;
}
