import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleLogoIcon, GoogleLogoIcon } from '@/components/icon';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingStore } from '@/store/use-onboarding-store';
import { useAuthStore } from '@/store/use-auth-store';

type Mode = 'signIn' | 'signUp';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const { toastMessage, showToast } = useToast();

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);

  // Reaching the sign-in screen — by any path (onboarding's Skip, finishing step 3, or Profile's
  // Log In row) — means onboarding is behind us; never show the carousel again on this device.
  useEffect(() => {
    useOnboardingStore.getState().completeOnboarding();
  }, []);

  function goHome() {
    router.replace('/');
  }

  async function handleEmailSubmit() {
    if (mode === 'signUp' && !name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setError(null);
    setBusy('email');
    const { error: authError } =
      mode === 'signIn' ? await signInWithEmail(email.trim(), password) : await signUpWithEmail(email.trim(), password, name.trim());
    setBusy(null);

    if (authError) {
      setError(authError);
      return;
    }
    if (mode === 'signUp') {
      showToast('Check your email to confirm your account');
      return;
    }
    goHome();
  }

  async function handleGoogle() {
    setError(null);
    setBusy('google');
    const { error: authError } = await signInWithOAuth('google');
    setBusy(null);
    if (authError) {
      setError(authError);
      return;
    }
    goHome();
  }

  function handleGuest() {
    useOnboardingStore.getState().chooseGuest();
    goHome();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.screen, { backgroundColor: theme.surface, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <Tickle size={52} mood="idle" animated />
            <Text style={[styles.title, { color: theme.text }]}>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {mode === 'signIn' ? 'Your plans sync across devices.' : 'Takes a minute — your plans sync everywhere after.'}
            </Text>
          </View>

          <View style={styles.fields}>
            {mode === 'signUp' && (
              <View style={[styles.field, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError(null);
                  }}
                  placeholder="Name"
                  placeholderTextColor={theme.textTertiary}
                  autoComplete="name"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            )}
            <View style={[styles.field, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="Email"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[styles.input, { color: theme.text }]}
              />
            </View>
            <View style={[styles.field, styles.fieldRow, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="Password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                style={[styles.input, { flex: 1, color: theme.text }]}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Text style={{ fontSize: 10, fontWeight: '600', fontFamily: Fonts[600], color: theme.textTertiary }}>{showPassword ? 'hide' : 'show'}</Text>
              </Pressable>
            </View>
          </View>

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

          <Pressable
            onPress={handleEmailSubmit}
            disabled={busy !== null}
            style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: busy && busy !== 'email' ? 0.5 : 1 }]}>
            {busy === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'signIn' ? 'Sign in' : 'Create Account'}</Text>}
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={6}>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.body }}>
                {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: theme.accentStrong, fontWeight: '700' }}>{mode === 'signIn' ? 'Create one' : 'Log in'}</Text>
              </Text>
            </Pressable>
            {mode === 'signIn' && (
              <Pressable onPress={() => showToast('Password reset is coming soon')} hitSlop={6}>
                <Text style={{ color: theme.accentStrong, fontSize: Typography.body, fontWeight: '600' }}>Forgot password?</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerLabel, { color: theme.textTertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={busy !== null}
            style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.cardBorder, opacity: busy && busy !== 'google' ? 0.5 : 1 }]}>
            {busy === 'google' ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <GoogleLogoIcon size={18} />
                <Text style={[styles.oauthButtonText, { color: theme.text }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => showToast('Apple Sign-In is coming soon')}
            style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.cardBorder, opacity: 0.5 }]}>
            <AppleLogoIcon size={18} color={theme.text} />
            <Text style={[styles.oauthButtonText, { color: theme.text }]}>Continue with Apple</Text>
          </Pressable>

          <Pressable onPress={handleGuest} hitSlop={6} style={styles.guestLink}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.body, fontWeight: '600' }}>Keep using without an account</Text>
          </Pressable>
        </ScrollView>

        <Toast message={toastMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  head: { alignItems: 'flex-start', gap: 8, marginBottom: 22 },
  title: { fontSize: 22, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: -0.3 },
  subtitle: { fontSize: Typography.body, fontWeight: '500', fontFamily: Fonts[500] },
  fields: { gap: 10, marginBottom: 4 },
  field: { height: 52, borderRadius: 16, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  input: { fontSize: Typography.heading, fontWeight: '400' },
  error: { fontSize: Typography.body, fontWeight: '600', marginTop: 8, marginHorizontal: 2 },
  primaryButton: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.6 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    marginTop: 10,
  },
  oauthButtonText: { fontSize: Typography.heading, fontWeight: '700' },
  guestLink: { alignItems: 'center', paddingVertical: 18 },
});
