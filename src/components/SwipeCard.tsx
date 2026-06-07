import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { resolveInterests, sharedInterests } from '../lib/interests';
import { formatClock } from '../lib/time';
import { colors, fill, radius, spacing } from '../theme';
import type { Candidate } from '../types';
import { PhotoView } from './PhotoView';

/** Presentational card: a tappable photo carousel with profile info overlaid.
 *  Gestures + like/nope overlays are owned by the parent deck. */
export function SwipeCard({ candidate }: { candidate: Candidate }) {
  const { profile } = useApp();
  const [index, setIndex] = useState(0);
  const photos = candidate.photos;
  const photo = photos[Math.min(index, photos.length - 1)];

  // Prefer interests you share; otherwise show a few of theirs as a teaser.
  const shared = sharedInterests(profile?.interests ?? [], candidate.interests);
  const hasShared = shared.length > 0;
  const chips = (hasShared ? shared : resolveInterests(candidate.interests)).slice(0, 6);

  const advance = (dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return 0;
      if (next > photos.length - 1) return photos.length - 1;
      return next;
    });
  };

  const takenAt = new Date(photo.takenAt);

  return (
    <View style={styles.card}>
      <PhotoView photo={photo} name={candidate.name} style={styles.photo} initialSize={120} />

      {/* progress segments */}
      {photos.length > 1 && (
        <View style={styles.segments}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.segment, i === index && styles.segmentActive]}
            />
          ))}
        </View>
      )}

      {/* morning-photo proof badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>📷 Taken {formatClock(takenAt)}</Text>
      </View>

      {/* invisible tap zones to flip through photos */}
      <Pressable style={styles.tapLeft} onPress={() => advance(-1)} />
      <Pressable style={styles.tapRight} onPress={() => advance(1)} />

      {/* info gradient-ish footer */}
      <View style={styles.footer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {candidate.name}
          </Text>
          <Text style={styles.age}>{candidate.age}</Text>
        </View>
        <Text style={styles.meta}>
          {candidate.distance} miles away
          {candidate.profession ? ` · ${candidate.profession}` : ''}
        </Text>
        <Text style={styles.bio} numberOfLines={2}>
          {candidate.bio}
        </Text>

        {candidate.prompts.length > 0 && (
          <View style={styles.prompt}>
            <Text style={styles.promptQ}>{candidate.prompts[0].prompt}</Text>
            <Text style={styles.promptA} numberOfLines={2}>
              {candidate.prompts[0].answer}
            </Text>
          </View>
        )}

        {chips.length > 0 && (
          <View style={styles.interests}>
            {hasShared && (
              <Text style={styles.commonLabel}>✨ {shared.length} in common</Text>
            )}
            <View style={styles.chipRow}>
              {chips.map((it) => (
                <View
                  key={it.id}
                  style={[styles.chip, hasShared && styles.chipShared]}
                >
                  <Text
                    style={[styles.chipText, hasShared && styles.chipTextShared]}
                  >
                    {it.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
    // soft shadow
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  photo: {
    ...fill,
    width: undefined,
    height: undefined,
    backgroundColor: colors.inkSoft,
  },
  segments: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  segmentActive: {
    backgroundColor: colors.white,
  },
  badge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 120,
    width: '35%',
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 120,
    width: '35%',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  name: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    flexShrink: 1,
  },
  age: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '400',
  },
  meta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  bio: {
    color: colors.white,
    fontSize: 15,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  prompt: {
    marginTop: spacing.sm,
  },
  promptQ: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '800',
  },
  promptA: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
    lineHeight: 20,
  },
  interests: {
    marginTop: spacing.sm,
    gap: 6,
  },
  commonLabel: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  chipShared: {
    backgroundColor: colors.background,
  },
  chipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextShared: {
    color: colors.ink,
  },
});
