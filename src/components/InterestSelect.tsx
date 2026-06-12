import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  countForParent,
  MAX_PER_PARENT,
  PARENT_CATEGORIES,
  PARENT_EMOJI,
  resolveInterests,
  searchInterests,
  type ParentCategory,
} from '../lib/interests';
import { colors, radius, spacing } from '../theme';

/**
 * Interest picker with one section per parent category. Each section has its own
 * autocomplete search scoped to that category, the per-parent cap of
 * {@link MAX_PER_PARENT}, and removable badges for what's selected there.
 */
export function InterestSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <View style={styles.root}>
      {PARENT_CATEGORIES.map((parent) => (
        <ParentSection
          key={parent}
          parent={parent}
          selected={selected}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

function ParentSection({
  parent,
  selected,
  onChange,
}: {
  parent: ParentCategory;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selectedSet = new Set(selected);
  const count = countForParent(selected, parent);
  const full = count >= MAX_PER_PARENT;

  // Badges for this category. resolveInterests drops unknown ids; we also guard
  // against any empty label so a blank badge can never render.
  const chosen = resolveInterests(selected).filter(
    (it) => it.parent === parent && it.label.trim().length > 0,
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchInterests(query)
      .filter((it) => it.parent === parent && !selectedSet.has(it.id))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected, parent]);

  const add = (id: string) => {
    if (selectedSet.has(id) || full) return;
    onChange([...selected, id]);
    setQuery('');
  };
  const remove = (id: string) => onChange(selected.filter((x) => x !== id));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {PARENT_EMOJI[parent]} {parent}
        </Text>
        <Text style={[styles.count, full && styles.countFull]}>
          {count}/{MAX_PER_PARENT}
        </Text>
      </View>

      <TextInput
        style={[styles.search, full && styles.searchDisabled]}
        value={query}
        onChangeText={setQuery}
        editable={!full}
        placeholder={full ? `Max ${MAX_PER_PARENT} reached` : `Search ${parent.toLowerCase()}…`}
        placeholderTextColor={colors.inkSoft}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => add(it.id)}
              style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
            >
              <Text style={styles.resultLabel}>{it.label}</Text>
              <Text style={styles.resultPlus}>＋</Text>
            </Pressable>
          ))}
        </View>
      )}

      {chosen.length > 0 && (
        <View style={styles.badges}>
          {chosen.map((it) => (
            <Pressable key={it.id} style={styles.badge} onPress={() => remove(it.id)} hitSlop={6}>
              <Text style={styles.badgeText}>{it.label}</Text>
              <Text style={styles.badgeX}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
  },
  count: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  countFull: {
    color: colors.secondary,
  },
  search: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  searchDisabled: {
    opacity: 0.5,
  },
  results: {
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,185,28,0.4)',
  },
  resultPressed: {
    backgroundColor: 'rgba(254,32,0,0.08)',
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  resultPlus: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
});
