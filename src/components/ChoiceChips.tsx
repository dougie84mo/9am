import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

/**
 * A row of selectable pill chips. Single-select by default (tapping the active
 * chip clears it); pass `multi` for multi-select with an optional `max`.
 */
export function ChoiceChips({
  options,
  selected,
  onChange,
  multi = false,
  max,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  max?: number;
}) {
  const selectedSet = new Set(selected);

  const toggle = (value: string) => {
    if (multi) {
      if (selectedSet.has(value)) {
        onChange(selected.filter((v) => v !== value));
      } else if (max === undefined || selected.length < max) {
        onChange([...selected, value]);
      }
      return;
    }
    // Single-select: tapping the active chip clears it.
    onChange(selectedSet.has(value) ? [] : [value]);
  };

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const on = selectedSet.has(opt);
        const disabled = multi && !on && max !== undefined && selected.length >= max;
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            disabled={disabled}
            style={[styles.chip, on && styles.chipOn, disabled && styles.chipDisabled]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
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
