/**
 * Pure math for the slider components — kept out of the RN component so it can
 * be unit-tested without a renderer.
 */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Snap to the nearest step anchored at `min`. */
export function snap(v: number, min: number, step: number): number {
  if (step <= 0) return v;
  return min + Math.round((v - min) / step) * step;
}

/** A track ratio (0–1) → a clamped, snapped value in [min, max]. */
export function valueFromRatio(
  ratio: number,
  min: number,
  max: number,
  step: number,
): number {
  return clamp(snap(min + clamp(ratio, 0, 1) * (max - min), min, step), min, max);
}

/** A value → its track ratio (0–1). */
export function ratioFromValue(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}
