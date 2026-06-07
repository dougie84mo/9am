import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_PROMPTS, PROMPTS } from '../lib/profileFields';
import { colors, radius, spacing } from '../theme';
import type { ProfilePrompt } from '../types';

/**
 * Pick up to {@link MAX_PROMPTS} personal-question prompts and answer them.
 * Each selected prompt becomes an editable answer card; unused prompts show as
 * tappable chips until the max is reached.
 */
export function PromptPicker({
  value,
  onChange,
  max = MAX_PROMPTS,
}: {
  value: ProfilePrompt[];
  onChange: (next: ProfilePrompt[]) => void;
  max?: number;
}) {
  const used = new Set(value.map((p) => p.prompt));
  const available = PROMPTS.filter((p) => !used.has(p));
  const atMax = value.length >= max;

  const add = (prompt: string) => {
    if (!atMax) onChange([...value, { prompt, answer: '' }]);
  };
  const setAnswer = (i: number, answer: string) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, answer } : p)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <View style={{ gap: spacing.md }}>
      {value.map((p, i) => (
        <View key={p.prompt} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.prompt}>{p.prompt}</Text>
            <Pressable onPress={() => remove(i)} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={p.answer}
            onChangeText={(t) => setAnswer(i, t)}
            placeholder="Your answer…"
            placeholderTextColor={colors.inkSoft}
            multiline
            maxLength={140}
          />
        </View>
      ))}

      {!atMax && available.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.addLabel}>
            Add a prompt ({value.length}/{max})
          </Text>
          <View style={styles.chips}>
            {available.map((p) => (
              <Pressable key={p} style={styles.addChip} onPress={() => add(p)}>
                <Text style={styles.addChipText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {atMax && (
        <Text style={styles.addLabel}>That's the max — remove one to swap.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  prompt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: colors.ink,
  },
  remove: {
    color: colors.inkSoft,
    fontWeight: '800',
    fontSize: 15,
  },
  input: {
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 4,
    minHeight: 24,
    textAlignVertical: 'top',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
});
