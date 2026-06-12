import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compatibilityScore,
  countForParent,
  INTERESTS,
  interestsForParent,
  MAX_PER_PARENT,
  PARENT_CATEGORIES,
  resolveInterests,
  searchInterests,
  sharedInterestIds,
} from './interests.ts';

test('every interest id is unique and resolvable', () => {
  const ids = INTERESTS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate interest ids');
  assert.equal(resolveInterests(ids).length, ids.length);
  assert.deepEqual(resolveInterests(['Nope:Nonexistent']), []);
});

test('each parent has at least a dozen sub-categories', () => {
  for (const parent of PARENT_CATEGORIES) {
    assert.ok(
      interestsForParent(parent).length >= 12,
      `${parent} has too few sub-categories`,
    );
  }
});

test('countForParent only counts ids in that parent', () => {
  const picks = ['Sports:Tennis', 'Sports:Golf', 'Music:Jazz'];
  assert.equal(countForParent(picks, 'Sports'), 2);
  assert.equal(countForParent(picks, 'Music'), 1);
  assert.equal(countForParent(picks, 'Food'), 0);
});

test('a full parent (7) blocks more without limiting other parents', () => {
  const sports = interestsForParent('Sports').slice(0, MAX_PER_PARENT).map((i) => i.id);
  assert.equal(sports.length, MAX_PER_PARENT);
  assert.equal(countForParent(sports, 'Sports'), MAX_PER_PARENT);
  // The cap is per-parent, so a different parent is still wide open.
  assert.equal(countForParent([...sports, 'Music:Jazz'], 'Music'), 1);
});

test('searchInterests: empty query returns nothing; matches are case-insensitive', () => {
  assert.deepEqual(searchInterests(''), []);
  assert.deepEqual(searchInterests('   '), []);
  const hiking = searchInterests('HIK');
  assert.ok(hiking.some((i) => i.id === 'Activities:Hiking'));
});

test('searchInterests ranks prefix matches ahead of substring matches', () => {
  // "Rock" is a prefix of Music:Rock and Sports:Rock climbing; it is also a
  // substring of Sports:Bouldering? no — use a clear case: "run".
  const results = searchInterests('run');
  const ids = results.map((i) => i.id);
  // Prefix hits ("Running") must precede substring hits ("Trail running").
  assert.ok(ids.indexOf('Sports:Running') < ids.indexOf('Sports:Trail running'));
});

test('compatibility = count of shared interests, order-independent', () => {
  const me = ['Music:Jazz', 'Sports:Cycling', 'Values:Mindfulness'];
  const them = ['Sports:Cycling', 'Music:Jazz', 'Food:Coffee'];
  assert.deepEqual(sharedInterestIds(me, them).sort(), ['Music:Jazz', 'Sports:Cycling']);
  assert.equal(compatibilityScore(me, them), 2);
  assert.equal(compatibilityScore(me, them), compatibilityScore(them, me));
  assert.equal(compatibilityScore(me, []), 0);
});
