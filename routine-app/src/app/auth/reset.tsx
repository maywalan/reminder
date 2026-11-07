import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XIcon } from '@/components/icon';
import { Text, TextInput } from '@/components/text';
import { Tickle } from '@/components/tickle';
import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { PASSWORD_RESET_PATH, useAuthStore } from '@/store/use-auth-store';

const MIN_PASSWORD_LENGTH = 6;

type Phase = 'verifying' | 'ready' | 'saving' | 'done' | 'failed';

/**
 * Opened by the password-reset email (`tickle://auth/reset#access_token=…&type=recovery`).
 * Signs in with the link's one-time session, then asks for a new password.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const url = Linking.useLinkingURL();
  const signInFromResetLink = useAuthStore((s) => s.signInFromResetLink);
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !url.includes(PASSWORD_RESET_PATH) || handledUrl.current === url) return;
    handledUrl.current = url;
    signInFromResetLink(url).then(({ error: linkError }) => {
      if (linkError) {
        setError(linkError);
        setPhase('failed');
      } else {
        setPhase('ready');
      }
    });
  }, [url, signInFromResetLink]);

  async function handleSave() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('login.passwordShort'));
      return;
    }
    setError(null);
    setPhase('saving');
    const { error: saveError } = await updatePassword(password);
    if (saveError) {
      setError(saveError);
      setPhase('ready');
      return;
    }
    setPhase('done');
  }

  // Opened from a link, so there's usually nothing to go back to: leave to Home. If the link already
  // signed the user in, closing keeps them signed in with their old password.
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const title = phase === 'done' ? t('reset.saved') : t('reset.title');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.screen, { backgroundColor: theme.surface, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topRow}>
          <Tickle size={52} mood="idle" animated />
          {phase !== 'saving' && (
            <Pressable
              onPress={close}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.bg, opacity: pressed ? 0.6 : 1 }]}>
              <XIcon size={16} color={theme.textSecondary} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>

        {phase === 'verifying' && <ActivityIndicator style={{ marginTop: 24 }} color={theme.textSecondary} />}

        {(phase === 'ready' || phase === 'saving') && (
          <>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('reset.sub')}</Text>
            <View style={[styles.field, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                placeholder={t('reset.newPassword')}
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
                accessibilityLabel={t('reset.newPassword')}
                style={[styles.input, { flex: 1, color: theme.text }]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}>
                <Text style={[styles.toggleText, { color: theme.textSecondary }]}>{showPassword ? t('login.hide') : t('login.show')}</Text>
              </Pressable>
            </View>
          </>
        )}

        {error && (
          <Text style={[styles.error, { color: theme.danger }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            {error}
          </Text>
        )}

        {(phase === 'ready' || phase === 'saving') && (
          <Pressable
            onPress={handleSave}
            disabled={phase === 'saving'}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            {phase === 'saving' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('reset.save')}</Text>}
          </Pressable>
        )}

        {phase === 'done' && (
          <Pressable
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.primaryButtonText}>{t('reset.continue')}</Text>
          </Pressable>
        )}

        {phase === 'failed' && (
          <Pressable
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.primaryButtonText}>{t('login.backToSignInButton')}</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, alignItems: 'stretch' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.screenTitle, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: -0.3, marginTop: 18 },
  subtitle: { fontSize: Typography.body, fontWeight: '500', fontFamily: Fonts[500], lineHeight: 19, marginTop: 8, marginBottom: 22 },
  field: { height: 52, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  input: { fontSize: Typography.heading, fontWeight: '400' },
  toggleText: { fontSize: Typography.body, fontWeight: '600', fontFamily: Fonts[600] },
  error: { fontSize: Typography.body, fontWeight: '600', lineHeight: 19, marginTop: 8, marginHorizontal: 2 },
  primaryButton: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryButtonText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
});
