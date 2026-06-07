import type { Candidate, MatchPreferences, UserProfile } from '../types';
import type { Gender } from './profileFields';

/** The minimal shape needed to evaluate a match preference filter. */
type Party = MatchPreferences & { gender: Gender | null; age: number };

/**
 * Mutual preference gate: a candidate is visible to the viewer only if **both**
 * sides' gender + age preferences are satisfied. This is a hard filter — it runs
 * before interest-based ranking, so someone outside your stated preferences
 * never appears, regardless of shared interests.
 *
 * Empty `preferredGenders` means "no constraint" (everyone). A null gender skips
 * only the check that depends on it (e.g. a viewer who hasn't set their gender
 * yet isn't excluded by candidates' gender preferences).
 */
export function passesPreferences(viewer: Party, candidate: Party): boolean {
  // Viewer's gender preference vs the candidate's gender.
  if (
    viewer.preferredGenders.length > 0 &&
    !viewer.preferredGenders.includes(candidate.gender as Gender)
  ) {
    return false;
  }
  // Candidate's gender preference vs the viewer's gender.
  if (
    viewer.gender &&
    candidate.preferredGenders.length > 0 &&
    !candidate.preferredGenders.includes(viewer.gender)
  ) {
    return false;
  }
  // Mutual age range.
  if (candidate.age < viewer.ageMin || candidate.age > viewer.ageMax) return false;
  if (viewer.age < candidate.ageMin || viewer.age > candidate.ageMax) return false;

  return true;
}

/** Convenience wrapper over the full domain types. */
export function candidateVisible(viewer: UserProfile, candidate: Candidate): boolean {
  return passesPreferences(viewer, candidate);
}
