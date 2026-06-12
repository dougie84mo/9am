import assert from 'node:assert/strict';
import { test } from 'node:test';
import { haversineMiles, milesBetween } from './geo.ts';

test('haversineMiles: zero distance for identical points', () => {
  assert.equal(haversineMiles(40.7128, -74.006, 40.7128, -74.006), 0);
});

test('haversineMiles: NYC → LA is ~2450 miles', () => {
  const d = haversineMiles(40.7128, -74.006, 34.0522, -118.2437);
  assert.ok(Math.abs(d - 2450) < 30, `expected ~2450, got ${d}`);
});

test('haversineMiles: ~1 degree of latitude is ~69 miles', () => {
  const d = haversineMiles(40, -74, 41, -74);
  assert.ok(Math.abs(d - 69) < 1, `expected ~69, got ${d}`);
});

test('milesBetween: rounds, and is null when coordinates are missing', () => {
  const nyc = { latitude: 40.7128, longitude: -74.006 };
  const la = { latitude: 34.0522, longitude: -118.2437 };
  assert.equal(milesBetween(nyc, nyc), 0);
  assert.ok(Number.isInteger(milesBetween(nyc, la)));
  assert.equal(milesBetween(nyc, { latitude: null, longitude: null }), null);
  assert.equal(milesBetween(null, la), null);
  assert.equal(milesBetween(nyc, undefined), null);
});
