/**
 * 9am design tokens.
 *
 * Brand palette (requested):
 *   - background / primary: #F3C521 (gold)
 *   - secondary / accent:   #FE2000 (red)
 */
export const colors = {
  // Bad Friends palette: bold yellow + black + red, with a pink accent.
  background: '#F3C521',
  primary: '#F3C521',
  secondary: '#FE2000',

  // Derived neutrals that read well on the gold background.
  ink: '#1A1206', // near-black with a warm tint
  inkSoft: '#5C4A1F',
  card: '#FFFDF5',
  cardBorder: '#E4B91C',
  white: '#FFFFFF',

  // Bad Friends signature high-contrast black + pink pop.
  night: '#141414',
  pink: '#FF3DA5',

  // Swipe affordances.
  like: '#1Fae5a',
  nope: '#FE2000',

  overlay: 'rgba(26, 18, 6, 0.55)',
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fonts = {
  /** Heavy condensed display face — the bold, all-caps Bad Friends headline
   *  look. Loaded at startup in App.tsx (@expo-google-fonts/anton). */
  display: 'Anton_400Regular',
} as const;

/** Absolute-fill shorthand. (RN's StyleSheet.absoluteFillObject is missing from
 *  the SDK 56 typings, so we define our own.) */
export const fill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;
