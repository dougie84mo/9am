import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoView } from '../components/PhotoView';
import { useApp } from '../context/AppContext';
import { formatClock } from '../lib/time';
import { colors, radius, spacing } from '../theme';
import type { Candidate, ChatMessage } from '../types';

export function ChatScreen({
  candidate,
  onBack,
}: {
  candidate: Candidate;
  onBack: () => void;
}) {
  const { messagesFor, sendMessage } = useApp();
  const messages = messagesFor(candidate.id);
  const [draft, setDraft] = useState('');

  // Inverted list renders newest at the bottom and auto-sticks there.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(candidate.id, draft);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <PhotoView photo={candidate.photos[0]} name={candidate.name} style={styles.avatar} initialSize={18} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{candidate.name}</Text>
          <Text style={styles.sub}>Matched · say good morning</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {data.length === 0 ? (
          <View style={styles.empty}>
            <PhotoView photo={candidate.photos[0]} name={candidate.name} style={styles.emptyAvatar} initialSize={44} />
            <Text style={styles.emptyTitle}>You matched with {candidate.name}</Text>
            <Text style={styles.emptyText}>
              No pressure, no clever opener needed. A simple "good morning" works.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Bubble message={item} />}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${candidate.name}…`}
            placeholderTextColor={colors.inkSoft}
            multiline
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!draft.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.from === 'me';
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
          {message.text}
        </Text>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatClock(new Date(message.sentAt))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  back: {
    paddingHorizontal: spacing.xs,
  },
  backText: {
    fontSize: 40,
    color: colors.ink,
    lineHeight: 42,
    fontWeight: '300',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inkSoft,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    fontSize: 12,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.secondary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bubbleText: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  time: {
    fontSize: 10,
    color: colors.inkSoft,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
    backgroundColor: colors.inkSoft,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: colors.ink,
    maxHeight: 120,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
});
