import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from './src/components/Logo';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SwipeScreen } from './src/screens/SwipeScreen';
import { colors, spacing } from './src/theme';

type Tab = 'swipe' | 'matches' | 'profile';

const TABS: { key: Tab; label: string; glyph: string }[] = [
  { key: 'swipe', label: 'Discover', glyph: '🔥' },
  { key: 'matches', label: 'Matches', glyph: '💛' },
  { key: 'profile', label: 'Profile', glyph: '🙂' },
];

function MainApp() {
  const [tab, setTab] = useState<Tab>('swipe');
  const { matches } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {tab === 'swipe' && <SwipeScreen />}
        {tab === 'matches' && <MatchesScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </View>

      {/* Pad the tab bar by the bottom inset so it clears the Android gesture /
          nav bar and the iOS home indicator. */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
              <View>
                <Text style={[styles.tabGlyph, !active && styles.tabGlyphInactive]}>
                  {t.glyph}
                </Text>
                {t.key === 'matches' && matches.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{matches.length}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ConfigNeeded() {
  return (
    <View style={styles.splash}>
      <Logo size={88} />
      <Text style={styles.configText}>
        Supabase isn't configured. Add EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file, then restart.
      </Text>
    </View>
  );
}

function Root() {
  const { ready, configured, authed, profile } = useApp();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Logo size={96} />
        <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  if (!configured) return <ConfigNeeded />;
  if (!authed) return <AuthScreen />;

  return profile ? <MainApp /> : <OnboardingScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  configText: {
    marginTop: spacing.lg,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabGlyph: {
    fontSize: 24,
  },
  tabGlyphInactive: {
    opacity: 0.45,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  tabLabelActive: {
    color: colors.secondary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
