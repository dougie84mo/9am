/**
 * The 9am rule: the in-app camera may only be used between 8:00am and 10:00am
 * local time. Everything photo-related funnels through these helpers so the
 * window lives in exactly one place.
 */

export const PHOTO_WINDOW_START_HOUR = 8; // 8:00am inclusive
export const PHOTO_WINDOW_END_HOUR = 10; // 10:00am exclusive

/**
 * Dev escape hatch. The camera is only usable for two hours a day, which makes
 * the app impossible to demo the other twenty-two. When this is true, the gate
 * is treated as permanently open. It is surfaced in the UI as an obvious,
 * clearly-labelled developer toggle — never silently on.
 */
let devBypass = false;

export function setDevBypass(value: boolean): void {
  devBypass = value;
}

export function isDevBypassEnabled(): boolean {
  return devBypass;
}

/** Is `date` inside the photo window? */
export function isWithinPhotoWindow(date: Date = new Date()): boolean {
  if (devBypass) return true;
  const hour = date.getHours();
  return hour >= PHOTO_WINDOW_START_HOUR && hour < PHOTO_WINDOW_END_HOUR;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "8:00 AM", "10:00 AM" — for copy. */
export function windowLabel(): string {
  return `${PHOTO_WINDOW_START_HOUR}:00 AM – ${PHOTO_WINDOW_END_HOUR}:00 AM`;
}

/** Friendly clock like "9:07 AM". */
export function formatClock(date: Date = new Date()): string {
  let hour = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${pad(minutes)} ${meridiem}`;
}

/** The next moment the window opens, relative to `from`. */
function nextWindowStart(from: Date): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(0);
  next.setHours(PHOTO_WINDOW_START_HOUR);
  // If we're already past today's window (>= start), jump to tomorrow.
  if (from.getHours() >= PHOTO_WINDOW_START_HOUR) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Human countdown to the next window, e.g. "opens in 3h 12m" or, when the
 * window is open, the time left in it ("closes in 47m").
 */
export function windowCountdown(from: Date = new Date()): string {
  if (isWithinPhotoWindow(from)) {
    const close = new Date(from);
    close.setHours(PHOTO_WINDOW_END_HOUR, 0, 0, 0);
    return `closes in ${humanizeDelta(close.getTime() - from.getTime())}`;
  }
  const open = nextWindowStart(from);
  return `opens in ${humanizeDelta(open.getTime() - from.getTime())}`;
}

function humanizeDelta(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
