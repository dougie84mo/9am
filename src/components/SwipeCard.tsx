import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { resolveInterests, sharedInterests } from '../lib/interests';
import { formatClock } from '../lib/time';
import { colors, fill, fonts, radius, spacing } from '../theme';
import type { Candidate } from '../types';
import { PhotoView } from './PhotoView';

/** Presentational deck card. Tapping it opens the full, scrollable profile;
 *  dragging it (handled by the parent deck) swipes. */
export function SwipeCard({
  candidate,
  onOpenDetails,
}: {
  candidate: Candidate;
  onOpenDetails?: () => void;
}) {
  const { profile } = useApp();
  const photo = candidate.photos[0];

  // Prefer interests you share; otherwise show a few of theirs as a teaser.
  const shared = sharedInterests(profile?.interests ?? [], candidate.interests);
  const hasShared = shared.length > 0;
  const chips = (hasShared ? shared : resolveInterests(candidate.interests)).slice(0, 6);

  return (
    <Pressable style={styles.card} onPress={onOpenDetails}>
      <PhotoView photo={photo} name={candidate.name} style={styles.photo} initialSize={120} />

      {photo && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📷 Taken {formatClock(new Date(photo.takenAt))}</Text>
        </View>
      )}

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
                <View key={it.id} style={[styles.chip, hasShared && styles.chipShared]}>
                  <Text style={[styles.chipText, hasShared && styles.chipTextShared]}>
                    {it.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.tapHint}>Tap to view profile ›</Text>
      </View>
    </Pressable>
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
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 30,
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
  tapHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
