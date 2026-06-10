import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoView } from '../components/PhotoView';
import { useApp } from '../context/AppContext';
import { resolveInterests, sharedInterestIds } from '../lib/interests';
import { formatClock } from '../lib/time';
import { colors, radius, spacing } from '../theme';
import type { Candidate } from '../types';

/** Full-profile view of another user — all photos, attributes, prompts, and
 *  interests (shared ones highlighted). Opened from the deck or a chat. */
export function CandidateDetailScreen({
  candidate,
  onBack,
  onSwipe,
}: {
  candidate: Candidate;
  onBack: () => void;
  /** When provided, shows like/nope buttons so you can swipe from the profile. */
  onSwipe?: (direction: 'like' | 'nope') => void;
}) {
  const { profile } = useApp();
  const sharedIds = new Set(
    sharedInterestIds(profile?.interests ?? [], candidate.interests),
  );
  const interests = resolveInterests(candidate.interests);
  const attributes = ([candidate.gender, candidate.childrenStatus] as (string | null)[]).filter(
    (a): a is string => Boolean(a),
  );
  const hero = candidate.photos[0];
  const morePhotos = candidate.photos.slice(1);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {candidate.name}
        </Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          <PhotoView photo={hero} name={candidate.name} style={styles.hero} initialSize={120} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>
              {candidate.name}, {candidate.age}
            </Text>
            <Text style={styles.heroMeta}>
              {candidate.distance} miles away
              {candidate.profession ? ` · ${candidate.profession}` : ''}
            </Text>
          </View>
          {hero && (
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>
                📷 {formatClock(new Date(hero.takenAt))}
              </Text>
            </View>
          )}
        </View>

        {attributes.length > 0 && (
          <View style={styles.pillRow}>
            {attributes.map((a) => (
              <View key={a} style={styles.pill}>
                <Text style={styles.pillText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {candidate.bio.length > 0 && <Text style={styles.bio}>{candidate.bio}</Text>}

        {candidate.prompts.length > 0 && (
          <View style={styles.section}>
            {candidate.prompts.map((p) => (
              <View key={p.prompt} style={styles.promptCard}>
                <Text style={styles.promptQ}>{p.prompt}</Text>
                <Text style={styles.promptA}>{p.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chips}>
              {interests.map((it) => {
                const shared = sharedIds.has(it.id);
                return (
                  <View key={it.id} style={[styles.chip, shared && styles.chipShared]}>
                    <Text style={[styles.chipText, shared && styles.chipTextShared]}>
                      {shared ? `✨ ${it.label}` : it.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {morePhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More photos</Text>
            {morePhotos.map((p, i) => (
              <View key={i} style={styles.morePhotoWrap}>
                <PhotoView photo={p} name={candidate.name} style={styles.morePhoto} initialSize={96} />
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>
                    📷 {formatClock(new Date(p.takenAt))}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {onSwipe && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.roundBtn, styles.nopeBtn]}
            onPress={() => onSwipe('nope')}
          >
            <Text style={[styles.roundGlyph, { color: colors.nope }]}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.roundBtn, styles.likeBtn]}
            onPress={() => onSwipe('like')}
          >
            <Text style={styles.roundGlyphLike}>♥</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: { width: 40 },
  backText: { fontSize: 40, color: colors.ink, lineHeight: 42, fontWeight: '300' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  heroWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.white,
  },
  hero: { width: '100%', aspectRatio: 0.85, backgroundColor: colors.inkSoft },
  heroInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroName: { color: colors.white, fontSize: 28, fontWeight: '900' },
  heroMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  timeBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  timeBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  bio: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  promptQ: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  promptA: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
    lineHeight: 23,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipShared: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chipTextShared: { color: colors.white },
  morePhotoWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  morePhoto: { width: '100%', aspectRatio: 0.85, backgroundColor: colors.inkSoft },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  roundBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nopeBtn: { borderWidth: 2, borderColor: colors.nope },
  likeBtn: { backgroundColor: colors.secondary },
  roundGlyph: { fontSize: 27, fontWeight: '900' },
  roundGlyphLike: { fontSize: 29, color: colors.white },
});
