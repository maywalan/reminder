import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleLogoIcon, GoogleLogoIcon } from '@/components/icon';
import { Toast } from '@/components/toast';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);

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
    router.back();
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
    // The OAuth redirect deep link pushes an extra /auth/callback route onto the stack (on top
    // of this modal) before landing here — dismissAll clears both in one go, back() would only
    // clear one.
    if (router.canDismiss()) router.dismissAll();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.heading, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: theme.text, fontSize: Typography.title, fontWeight: '800' }}>{mode === 'signIn' ? 'Log In' : 'Create Account'}</Text>
          <View style={{ width: 46 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
            {mode === 'signUp' && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError(null);
                  }}
                  placeholder="Your name"
                  placeholderTextColor={theme.textTertiary}
                  autoComplete="name"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            )}
            <View style={[styles.field, mode === 'signUp' && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[styles.input, { color: theme.text }]}
              />
            </View>
            <View style={[styles.field, { borderTopWidth: 1, borderTopColor: theme.divider }]}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                style={[styles.input, { color: theme.text }]}
              />
            </View>
          </View>

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

          <Pressable
            onPress={handleEmailSubmit}
            disabled={busy !== null}
            style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: busy && busy !== 'email' ? 0.5 : 1 }]}>
            {busy === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'signIn' ? 'Log In' : 'Create Account'}</Text>}
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={6} style={styles.switchMode}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.body }}>
              {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: theme.accentStrong, fontWeight: '700' }}>{mode === 'signIn' ? 'Create one' : 'Log in'}</Text>
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerLabel, { color: theme.textTertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={busy !== null}
            style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.divider, opacity: busy && busy !== 'google' ? 0.5 : 1 }]}>
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
            style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.divider, opacity: 0.5 }]}>
            <AppleLogoIcon size={18} color={theme.text} />
            <Text style={[styles.oauthButtonText, { color: theme.text }]}>Continue with Apple</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} hitSlop={6} style={styles.guestLink}>
            <Text style={{ color: theme.textTertiary, fontSize: Typography.body, fontWeight: '600' }}>Continue as Guest</Text>
          </Pressable>
        </ScrollView>

        <Toast message={toastMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 16 },
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  field: { paddingHorizontal: 14, paddingVertical: 10 },
  label: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  input: { fontSize: Typography.heading, fontWeight: '600', paddingVertical: 2 },
  error: { fontSize: Typography.body, fontWeight: '600', marginTop: 8, marginHorizontal: 2 },
  primaryButton: { borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
  switchMode: { alignItems: 'center', paddingVertical: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.6 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 10,
  },
  oauthButtonText: { fontSize: Typography.heading, fontWeight: '700' },
  guestLink: { alignItems: 'center', paddingVertical: 18 },
});
