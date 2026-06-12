import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clamp, ratioFromValue, snap, valueFromRatio } from './slider.ts';

test('clamp keeps values within bounds', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test('snap rounds to the nearest step anchored at min', () => {
  assert.equal(snap(23, 18, 5), 23); // steps from 18: 18,23,28 → 23 is exact
  assert.equal(snap(26, 18, 5), 28); // nearest step to 26 is 28
  assert.equal(snap(20, 0, 5), 20);
  assert.equal(snap(22, 0, 5), 20);
  assert.equal(snap(23, 0, 5), 25);
});

test('valueFromRatio clamps and snaps into [min,max]', () => {
  assert.equal(valueFromRatio(0, 18, 99, 1), 18);
  assert.equal(valueFromRatio(1, 18, 99, 1), 99);
  assert.equal(valueFromRatio(0.5, 0, 100, 1), 50);
  assert.equal(valueFromRatio(-1, 18, 99, 1), 18); // below clamps to min
  assert.equal(valueFromRatio(2, 18, 99, 1), 99); // above clamps to max
});

test('ratioFromValue is the inverse mapping, clamped 0..1', () => {
  assert.equal(ratioFromValue(18, 18, 99), 0);
  assert.equal(ratioFromValue(99, 18, 99), 1);
  assert.equal(ratioFromValue(50, 0, 100), 0.5);
  assert.equal(ratioFromValue(-5, 0, 100), 0);
  assert.equal(ratioFromValue(200, 0, 100), 1);
});
