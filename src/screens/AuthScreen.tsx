import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

export function AuthScreen() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const session = await signUp(email.trim(), password);
        // With "Confirm email" on, sign-up doesn't create a session.
        if (!session) {
          setNotice('Check your email to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        await signIn(email.trim(), password);
      }
      // On success the auth listener swaps this screen out.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Logo size={84} />
        <Text style={styles.tagline}>Dating for who you really are.</Text>

        <View style={styles.form}>
          <Text style={styles.h1}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</Text>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.inkSoft}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Button
            label={mode === 'signin' ? 'Sign in' : 'Sign up'}
            onPress={submit}
            disabled={!valid}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />

          <Pressable
            onPress={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
              setNotice(null);
            }}
            style={{ marginTop: spacing.lg, alignItems: 'center' }}
          >
            <Text style={styles.toggle}>
              {mode === 'signin'
                ? "New here? Create an account"
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    alignSelf: 'stretch',
  },
  h1: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  notice: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  toggle: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '800',
  },
});
