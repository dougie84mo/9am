import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  countForParent,
  getInterest,
  MAX_PER_PARENT,
  PARENT_EMOJI,
  resolveInterests,
  searchInterests,
} from '../lib/interests';
import { colors, radius, spacing } from '../theme';

/**
 * Autocomplete interest picker. Replaces the long category grid: the user types
 * to search the whole taxonomy, taps a suggestion to add it as a badge, and taps
 * a badge to remove it. The per-parent cap of {@link MAX_PER_PARENT} is enforced
 * — suggestions from a full category are shown but disabled.
 */
export function InterestSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selectedSet = new Set(selected);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchInterests(query)
      .filter((it) => !selectedSet.has(it.id))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  const add = (id: string) => {
    const it = getInterest(id);
    if (!it || selectedSet.has(id)) return;
    if (countForParent(selected, it.parent) >= MAX_PER_PARENT) return;
    onChange([...selected, id]);
    setQuery('');
  };

  const remove = (id: string) => onChange(selected.filter((x) => x !== id));

  const chosen = resolveInterests(selected);

  return (
    <View>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search interests — hiking, jazz, sushi…"
        placeholderTextColor={colors.inkSoft}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((it) => {
            const full = countForParent(selected, it.parent) >= MAX_PER_PARENT;
            return (
              <Pressable
                key={it.id}
                onPress={() => add(it.id)}
                disabled={full}
                style={({ pressed }) => [
                  styles.result,
                  pressed && !full && styles.resultPressed,
                  full && styles.resultDisabled,
                ]}
              >
                <Text style={styles.resultLabel}>
                  {PARENT_EMOJI[it.parent]} {it.label}
                </Text>
                <Text style={[styles.resultParent, full && styles.resultParentFull]}>
                  {full ? `${it.parent} full` : it.parent}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {chosen.length === 0 ? (
        <Text style={styles.empty}>
          No interests yet — search above to add a few. We use these to rank your deck.
        </Text>
      ) : (
        <View style={styles.badges}>
          {chosen.map((it) => (
            <Pressable key={it.id} style={styles.badge} onPress={() => remove(it.id)} hitSlop={6}>
              <Text style={styles.badgeText}>
                {PARENT_EMOJI[it.parent]} {it.label}
              </Text>
              <Text style={styles.badgeX}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Up to {MAX_PER_PARENT} per category · tap a badge to remove
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  results: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,185,28,0.4)',
  },
  resultPressed: {
    backgroundColor: 'rgba(254,32,0,0.08)',
  },
  resultDisabled: {
    opacity: 0.45,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  resultParent: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    marginLeft: spacing.sm,
  },
  resultParentFull: {
    color: colors.secondary,
  },
  empty: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    marginTop: spacing.md,
    lineHeight: 19,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  badgeX: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.85)',
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
});
