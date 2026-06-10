import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

/**
 * The "9AM" wordmark — the 9 in red, "AM" in black — with an optional
 * Bad Friends co-brand kicker for hero placements.
 */
export function Logo({ size = 64, kicker = false }: { size?: number; kicker?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.nine, { fontSize: size }]}>9</Text>
        <Text style={[styles.am, { fontSize: size * 0.6 }]}>AM</Text>
      </View>
      {kicker && (
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>BAD FRIENDS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  nine: {
    fontFamily: fonts.display,
    color: colors.secondary,
  },
  am: {
    fontFamily: fonts.display,
    color: colors.night,
    marginBottom: 4,
  },
  kicker: {
    marginTop: 8,
    backgroundColor: colors.night,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  kickerText: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 12,
    letterSpacing: 2,
  },
});
