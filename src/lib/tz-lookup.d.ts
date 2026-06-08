// tz-lookup ships no types; it's a single function: (lat, lon) -> IANA zone.
declare module 'tz-lookup' {
  export default function tzlookup(latitude: number, longitude: number): string;
}
