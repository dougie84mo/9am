import assert from 'node:assert/strict';
import { test } from 'node:test';
import { candidateVisible, passesPreferences } from './matching.ts';

// Minimal Party with permissive defaults; override per case.
const make = (o = {}) => ({
  gender: null,
  preferredGenders: [],
  age: 30,
  ageMin: 18,
  ageMax: 99,
  ...o,
});

test('empty preferredGenders means everyone (gender-wise)', () => {
  const viewer = make({ gender: 'Man' });
  assert.equal(passesPreferences(viewer, make({ gender: 'Woman' })), true);
  assert.equal(passesPreferences(viewer, make({ gender: 'Nonbinary' })), true);
});

test('viewer gender preference filters the candidate', () => {
  const viewer = make({ gender: 'Man', preferredGenders: ['Woman'] });
  assert.equal(passesPreferences(viewer, make({ gender: 'Woman' })), true);
  assert.equal(passesPreferences(viewer, make({ gender: 'Man' })), false);
});

test('filtering is mutual: candidate preference filters the viewer', () => {
  const viewer = make({ gender: 'Man', preferredGenders: ['Woman'] });
  const wantsMen = make({ gender: 'Woman', preferredGenders: ['Man'] });
  const wantsNB = make({ gender: 'Woman', preferredGenders: ['Nonbinary'] });
  assert.equal(passesPreferences(viewer, wantsMen), true);
  assert.equal(passesPreferences(viewer, wantsNB), false);
});

test('age range is mutual', () => {
  // Viewer too old for the candidate's max.
  assert.equal(
    passesPreferences(make({ age: 50 }), make({ ageMax: 40, age: 28 })),
    false,
  );
  // Candidate too young for the viewer's min.
  assert.equal(
    passesPreferences(make({ ageMin: 30 }), make({ age: 25 })),
    false,
  );
  // Both within range.
  assert.equal(
    passesPreferences(make({ ageMin: 25, ageMax: 40, age: 30 }), make({ age: 28 })),
    true,
  );
});

test('a null viewer gender skips only the candidate-side gender check', () => {
  const viewer = make({ gender: null, preferredGenders: ['Woman'] });
  const cand = make({ gender: 'Woman', preferredGenders: ['Man'] });
  // Candidate wants 'Man' but viewer gender is unknown → that check is skipped.
  assert.equal(passesPreferences(viewer, cand), true);
});

test('candidateVisible distance gate: radius hides far candidates only', () => {
  // Permissive gender/age so only distance is exercised.
  const viewer = (maxDistance: number | null) =>
    ({ gender: null, preferredGenders: [], age: 30, ageMin: 18, ageMax: 99, maxDistance }) as any;
  const cand = (distance: number | null) =>
    ({ gender: 'Woman', preferredGenders: [], age: 30, ageMin: 18, ageMax: 99, distance }) as any;

  assert.equal(candidateVisible(viewer(50), cand(20)), true, 'within radius');
  assert.equal(candidateVisible(viewer(50), cand(80)), false, 'beyond radius');
  assert.equal(candidateVisible(viewer(null), cand(9999)), true, 'Anywhere ignores distance');
  assert.equal(candidateVisible(viewer(50), cand(null)), true, 'unknown distance never hides');
});
