import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme';
import type { Photo } from '../types';

/**
 * A photo that degrades gracefully when its image can't load.
 *
 * Candidate portraits in the mock deck are remote URLs, so in Expo Go they need
 * internet. When there's no connection (or the URL 404s) `Image` would render an
 * empty grey box — so on error we fall back to a tinted tile with the person's
 * initial. Real camera photos are local `file://` uris and always load, so the
 * fallback only ever shows for unreachable remote images.
 */
export function PhotoView({
  photo,
  name,
  style,
  resizeMode = 'cover',
  initialSize = 44,
}: {
  photo: Photo | undefined;
  /** Used for the fallback initial + tint colour. */
  name?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  /** Font size of the fallback initial. */
  initialSize?: number;
}) {
  const uri = photo?.uri;
  const [failed, setFailed] = useState(false);

  // A single PhotoView is reused as a carousel flips between photos, so reset
  // the error state whenever the underlying uri changes.
  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) {
    const seed = name ?? uri ?? '';
    const initial = (name ?? '').trim().charAt(0).toUpperCase() || '·';
    return (
      <View
        style={[
          style as StyleProp<ViewStyle>,
          styles.placeholder,
          { backgroundColor: tintFor(seed) },
        ]}
      >
        <Text style={[styles.initial, { fontSize: initialSize }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

/** Deep, white-friendly tints that sit comfortably against the gold brand. */
const PALETTE = [
  '#2E5A88',
  '#8B3A62',
  '#2F7A5B',
  '#B5532A',
  '#5A4FB0',
  '#357A8A',
  '#9A6A2F',
  '#7A3550',
];

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkSoft,
  },
  initial: {
    color: colors.white,
    fontWeight: '800',
    opacity: 0.92,
  },
});
