import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoView } from '../components/PhotoView';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import type { MatchEntry } from '../types';
import { ChatScreen } from './ChatScreen';

export function MatchesScreen() {
  const { matches, messagesFor } = useApp();
  const [openChat, setOpenChat] = useState<MatchEntry | null>(null);

  if (openChat) {
    return <ChatScreen match={openChat} onBack={() => setOpenChat(null)} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Matches</Text>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💛</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Like someone who likes you back and they'll show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.conversationId}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          renderItem={({ item }) => {
            const c = item.candidate;
            const msgs = messagesFor(item.conversationId);
            const last = msgs[msgs.length - 1];
            const preview = last
              ? `${last.from === 'me' ? 'You: ' : ''}${last.text}`
              : c.bio;
            return (
              <Pressable style={styles.row} onPress={() => setOpenChat(item)}>
                <PhotoView photo={c.photos[0]} name={c.name} style={styles.avatar} initialSize={26} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {c.name}, {c.age}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                {msgs.length === 0 ? (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>NEW</Text>
                  </View>
                ) : (
                  <Text style={styles.chevron}>›</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.inkSoft,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  preview: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 2,
  },
  newPill: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  newPillText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  chevron: {
    fontSize: 28,
    color: colors.inkSoft,
    fontWeight: '300',
    paddingHorizontal: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
});
