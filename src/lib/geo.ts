/**
 * Geo helpers. Distances are computed client-side from stored coordinates so we
 * never persist a viewer-relative number — the same candidate is "3 miles away"
 * to one viewer and "40 miles away" to another.
 */

const EARTH_RADIUS_MILES = 3958.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lon points, in miles. */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distance in miles, rounded to a whole number for display, or null when
 *  either point is missing coordinates. */
export function milesBetween(
  a: { latitude?: number | null; longitude?: number | null } | null | undefined,
  b: { latitude?: number | null; longitude?: number | null } | null | undefined,
): number | null {
  if (
    !a ||
    !b ||
    a.latitude == null ||
    a.longitude == null ||
    b.latitude == null ||
    b.longitude == null
  ) {
    return null;
  }
  return Math.round(haversineMiles(a.latitude, a.longitude, b.latitude, b.longitude));
}
