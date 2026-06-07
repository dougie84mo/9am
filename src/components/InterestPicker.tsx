import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  countForParent,
  interestsForParent,
  MAX_PER_PARENT,
  PARENT_CATEGORIES,
  PARENT_EMOJI,
} from '../lib/interests';
import { colors, radius, spacing } from '../theme';

/**
 * Grid of selectable interest chips grouped by parent category. Enforces the
 * per-parent cap of {@link MAX_PER_PARENT}: once a category is full, its
 * remaining chips are disabled until you free a slot.
 *
 * Pass `scroll={false}` when embedding inside an existing ScrollView.
 */
export function InterestPicker({
  selected,
  onChange,
  scroll = true,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  scroll?: boolean;
}) {
  const selectedSet = new Set(selected);

  const toggle = (id: string, parent: (typeof PARENT_CATEGORIES)[number]) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (countForParent(selected, parent) < MAX_PER_PARENT) {
      onChange([...selected, id]);
    }
  };

  const body = (
    <View style={styles.body}>
      {PARENT_CATEGORIES.map((parent) => {
        const count = countForParent(selected, parent);
        const full = count >= MAX_PER_PARENT;
        return (
          <View key={parent} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {PARENT_EMOJI[parent]} {parent}
              </Text>
              <Text style={[styles.count, full && styles.countFull]}>
                {count}/{MAX_PER_PARENT}
              </Text>
            </View>
            <View style={styles.chips}>
              {interestsForParent(parent).map((it) => {
                const on = selectedSet.has(it.id);
                const disabled = !on && full;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => toggle(it.id, parent)}
                    disabled={disabled}
                    style={[
                      styles.chip,
                      on && styles.chipOn,
                      disabled && styles.chipDisabled,
                    ]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {it.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );

  if (!scroll) return body;
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  body: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipOn: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  chipTextOn: {
    color: colors.white,
  },
});
