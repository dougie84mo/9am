import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** The "9am" wordmark — the 9 in red, "am" in ink. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.nine, { fontSize: size }]}>9</Text>
      <Text style={[styles.am, { fontSize: size * 0.62 }]}>am</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  nine: {
    fontWeight: '900',
    color: colors.secondary,
    letterSpacing: -2,
  },
  am: {
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -1,
    marginBottom: 4,
  },
});
