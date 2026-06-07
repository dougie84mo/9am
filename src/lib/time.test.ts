import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatClock,
  isDevBypassEnabled,
  isWithinPhotoWindow,
  setDevBypass,
  windowCountdown,
  windowLabel,
} from './time.ts';

/** Local-time Date at the given clock, on a fixed arbitrary day. */
const at = (h: number, m = 0) => new Date(2026, 5, 6, h, m, 0, 0);

test('isWithinPhotoWindow: 8:00am–10:00am, start inclusive / end exclusive', () => {
  assert.equal(isWithinPhotoWindow(at(7, 59)), false);
  assert.equal(isWithinPhotoWindow(at(8, 0)), true); // start inclusive
  assert.equal(isWithinPhotoWindow(at(9, 0)), true);
  assert.equal(isWithinPhotoWindow(at(9, 59)), true);
  assert.equal(isWithinPhotoWindow(at(10, 0)), false); // end exclusive
  assert.equal(isWithinPhotoWindow(at(11, 0)), false);
  assert.equal(isWithinPhotoWindow(at(0, 0)), false);
});

test('windowLabel is the human-readable window', () => {
  assert.equal(windowLabel(), '8:00 AM – 10:00 AM');
});

test('formatClock renders 12-hour time with meridiem', () => {
  assert.equal(formatClock(at(9, 7)), '9:07 AM');
  assert.equal(formatClock(at(0, 5)), '12:05 AM'); // midnight -> 12
  assert.equal(formatClock(at(12, 0)), '12:00 PM'); // noon -> 12
  assert.equal(formatClock(at(13, 0)), '1:00 PM');
  assert.equal(formatClock(at(23, 59)), '11:59 PM');
});

test('windowCountdown counts down to close while open', () => {
  assert.equal(windowCountdown(at(9, 0)), 'closes in 1h 0m');
  assert.equal(windowCountdown(at(9, 30)), 'closes in 30m');
});

test('windowCountdown counts up to next open while closed', () => {
  assert.equal(windowCountdown(at(7, 0)), 'opens in 1h 0m'); // later today
  assert.equal(windowCountdown(at(11, 0)), 'opens in 21h 0m'); // tomorrow 8am
});

test('dev bypass forces the window open, and resets cleanly', () => {
  assert.equal(isDevBypassEnabled(), false);
  try {
    setDevBypass(true);
    assert.equal(isDevBypassEnabled(), true);
    assert.equal(isWithinPhotoWindow(at(3, 0)), true); // 3am, normally closed
  } finally {
    setDevBypass(false);
  }
  assert.equal(isDevBypassEnabled(), false);
  assert.equal(isWithinPhotoWindow(at(3, 0)), false);
});
