import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_PROMPTS, PROMPTS } from '../lib/profileFields';
import { colors, radius, spacing } from '../theme';
import type { ProfilePrompt } from '../types';

const ANSWER_MAX = 140;

/**
 * Pick up to {@link MAX_PROMPTS} personal-question prompts and answer them. Each
 * card's question can be swapped for another (keeping the answer), there's a
 * live character counter, and a shuffle adds a random unused prompt.
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
  // Which card (if any) has its "change question" chooser open.
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  const used = new Set(value.map((p) => p.prompt));
  const available = PROMPTS.filter((p) => !used.has(p));
  const atMax = value.length >= max;

  const add = (prompt: string) => {
    if (!atMax) onChange([...value, { prompt, answer: '' }]);
  };
  const setAnswer = (i: number, answer: string) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, answer } : p)));
  const changePrompt = (i: number, prompt: string) => {
    onChange(value.map((p, idx) => (idx === i ? { ...p, prompt } : p)));
    setSwapIndex(null);
  };
  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    setSwapIndex(null);
  };
  const shuffle = () => {
    if (atMax || available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    add(pick);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {value.map((p, i) => (
        <View key={`${p.prompt}-${i}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Pressable
              style={styles.promptTap}
              onPress={() => setSwapIndex(swapIndex === i ? null : i)}
              hitSlop={6}
            >
              <Text style={styles.prompt}>{p.prompt}</Text>
              <Text style={styles.changeHint}>
                {swapIndex === i ? 'Close' : 'Change ⌄'}
              </Text>
            </Pressable>
            <Pressable onPress={() => remove(i)} hitSlop={8}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>

          {swapIndex === i && (
            <View style={styles.chips}>
              {available.map((q) => (
                <Pressable key={q} style={styles.swapChip} onPress={() => changePrompt(i, q)}>
                  <Text style={styles.swapChipText}>{q}</Text>
                </Pressable>
              ))}
              {available.length === 0 && (
                <Text style={styles.addLabel}>No other prompts left.</Text>
              )}
            </View>
          )}

          <TextInput
            style={styles.input}
            value={p.answer}
            onChangeText={(t) => setAnswer(i, t.slice(0, ANSWER_MAX))}
            placeholder="Your answer…"
            placeholderTextColor={colors.inkSoft}
            multiline
          />
          <Text style={styles.counter}>
            {p.answer.length}/{ANSWER_MAX}
          </Text>
        </View>
      ))}

      {!atMax && available.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.addHeader}>
            <Text style={styles.addLabel}>
              Add a prompt ({value.length}/{max})
            </Text>
            <Pressable onPress={shuffle} style={styles.shuffle} hitSlop={6}>
              <Text style={styles.shuffleText}>🎲 Surprise me</Text>
            </Pressable>
          </View>
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
        <Text style={styles.addLabel}>That's the max — remove one to swap in another.</Text>
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
  promptTap: {
    flex: 1,
  },
  prompt: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.ink,
  },
  changeHint: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 2,
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
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  addHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  shuffle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(254,32,0,0.08)',
  },
  shuffleText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
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
  swapChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  swapChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
});
