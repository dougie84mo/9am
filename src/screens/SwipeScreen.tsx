import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { PhotoView } from '../components/PhotoView';
import { SwipeCard } from '../components/SwipeCard';
import { useApp } from '../context/AppContext';
import { colors, fill, radius, spacing } from '../theme';
import type { Candidate, SwipeDirection } from '../types';
import { CandidateDetailScreen } from './CandidateDetailScreen';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const OFF_SCREEN = SCREEN_W * 1.5;

/** Tactile feedback. Uses RN's built-in Vibration so we stay dependency-free in
 *  Expo Go; swap for `expo-haptics` (finer control on iOS) once it's installed. */
function buzz(pattern: number | number[]) {
  Vibration.vibrate(pattern);
}

export function SwipeScreen() {
  const { deck, swipe, undoLast, undoCount, deckEpoch, resetDeck } = useApp();
  // Snapshot the deck; context updates `seen` underneath us as we swipe, but we
  // drive the UI from this stable local queue + pointer. We only re-snapshot
  // when the deck is explicitly reset (deckEpoch changes) — not on every swipe.
  const [queue, setQueue] = useState<Candidate[]>(() => deck);
  const [index, setIndex] = useState(0);
  const [matched, setMatched] = useState<Candidate | null>(null);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (deckEpoch === 0) return; // initial snapshot already taken
    setQueue(deck);
    setIndex(0);
    position.setValue({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckEpoch]);

  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nextScale = position.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const commitSwipe = async (card: Candidate, direction: SwipeDirection) => {
    const didMatch = await swipe(card.id, direction);
    if (didMatch) {
      buzz([0, 25, 55, 25]); // celebratory double-tap on a match
      setMatched(card);
    } else if (direction === 'like') {
      buzz(10); // subtle tick to confirm a like landed
    }
  };

  const undo = () => {
    if (animatingRef.current || index === 0 || undoCount === 0) return;
    undoLast();
    setIndex((i) => Math.max(0, i - 1));
    position.setValue({ x: 0, y: 0 });
    buzz(8);
  };

  const forceSwipe = (direction: SwipeDirection) => {
    if (animatingRef.current) return;
    const card = queue[index];
    if (!card) return;
    animatingRef.current = true;
    Animated.timing(position, {
      toValue: { x: direction === 'like' ? OFF_SCREEN : -OFF_SCREEN, y: 0 },
      duration: 240,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
      animatingRef.current = false;
      void commitSwipe(card, direction);
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) forceSwipe('like');
        else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('nope');
        else resetPosition();
      },
      onPanResponderTerminate: () => resetPosition(),
    }),
  ).current;

  const current = queue[index];
  const next = queue[index + 1];

  if (detail) {
    return <CandidateDetailScreen candidate={detail} onBack={() => setDetail(null)} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Logo size={34} />
        <Text style={styles.headerHint}>fresh this morning</Text>
      </View>

      <View style={styles.deck}>
        {!current ? (
          <EmptyDeck onRefresh={resetDeck} />
        ) : (
          <>
            {next && (
              <Animated.View
                style={[styles.cardLayer, { transform: [{ scale: nextScale }] }]}
                pointerEvents="none"
              >
                <SwipeCard candidate={next} />
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.cardLayer,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <SwipeCard candidate={current} onOpenDetails={() => setDetail(current)} />

              <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
                <Text style={[styles.stampText, { color: colors.like }]}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
                <Text style={[styles.stampText, { color: colors.nope }]}>NOPE</Text>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>

      {current && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.roundBtn, styles.undoBtn, index === 0 && styles.undoDisabled]}
            onPress={undo}
            disabled={index === 0}
          >
            <Text style={[styles.roundGlyphSmall, { color: colors.inkSoft }]}>↩</Text>
          </Pressable>
          <Pressable
            style={[styles.roundBtn, styles.nopeBtn]}
            onPress={() => forceSwipe('nope')}
          >
            <Text style={[styles.roundGlyph, { color: colors.nope }]}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.roundBtn, styles.likeBtn]}
            onPress={() => forceSwipe('like')}
          >
            <Text style={styles.roundGlyphLike}>♥</Text>
          </Pressable>
        </View>
      )}

      <MatchModal candidate={matched} onClose={() => setMatched(null)} />
    </SafeAreaView>
  );
}

function EmptyDeck({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>☕️</Text>
      <Text style={styles.emptyTitle}>That's everyone for now</Text>
      <Text style={styles.emptyText}>
        You've seen all of this morning's faces. Check back after the next 9am
        window for fresh ones.
      </Text>
      <Button
        label="See them again"
        variant="outline"
        onPress={onRefresh}
        style={{ marginTop: spacing.xl, paddingHorizontal: spacing.xl }}
      />
    </View>
  );
}

function MatchModal({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!candidate} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {candidate && (
          <>
            <Text style={styles.modalTitle}>It's a match!</Text>
            <Text style={styles.modalSub}>
              You and {candidate.name} both liked each other this morning.
            </Text>
            <PhotoView photo={candidate.photos[0]} name={candidate.name} style={styles.modalPhoto} initialSize={72} />
            <Button
              label={`Say good morning to ${candidate.name}`}
              onPress={onClose}
              style={{ alignSelf: 'stretch', marginTop: spacing.xl }}
            />
            <Pressable onPress={onClose} style={{ marginTop: spacing.md }}>
              <Text style={styles.modalKeep}>Keep swiping</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerHint: {
    color: colors.inkSoft,
    fontWeight: '700',
    fontSize: 13,
  },
  deck: {
    flex: 1,
    margin: spacing.lg,
    marginTop: spacing.sm,
  },
  cardLayer: {
    ...fill,
  },
  stamp: {
    position: 'absolute',
    top: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 4,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  likeStamp: {
    left: 24,
    borderColor: colors.like,
    transform: [{ rotate: '-14deg' }],
  },
  nopeStamp: {
    right: 24,
    borderColor: colors.nope,
    transform: [{ rotate: '14deg' }],
  },
  stampText: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.lg,
  },
  roundBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nopeBtn: {
    borderWidth: 2,
    borderColor: colors.nope,
  },
  likeBtn: {
    backgroundColor: colors.secondary,
  },
  undoBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  undoDisabled: {
    opacity: 0.4,
  },
  roundGlyph: {
    fontSize: 28,
    fontWeight: '900',
  },
  roundGlyphSmall: {
    fontSize: 22,
    fontWeight: '900',
  },
  roundGlyphLike: {
    fontSize: 30,
    color: colors.white,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
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
  modalRoot: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.background,
  },
  modalSub: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalPhoto: {
    width: 180,
    height: 220,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: colors.background,
  },
  modalKeep: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
