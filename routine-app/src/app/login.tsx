import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/text';
import { AppleLogoIcon, CheckIcon, GoogleLogoIcon, XIcon } from '@/components/icon';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { lang, t } from '@/i18n';
import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingStore } from '@/store/use-onboarding-store';
import { useAuthStore } from '@/store/use-auth-store';

/** Sign in with Apple needs the paid Apple Developer membership. Until it's built, the button stays hidden. */
const SHOW_APPLE_SIGN_IN = false;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signIn' | 'signUp' | 'reset' | 'sent';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Profile pushes this screen with `from=profile`, so it gets a Close button. From onboarding it's
  // the way into the app, so it offers guest mode instead.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromProfile = from === 'profile';
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);
  const { toastMessage, toastKind } = useToast();

  const [mode, setMode] = useState<Mode>('signIn');
  // What the "Check your email" state is confirming: a new account, or a reset link.
  const [sentKind, setSentKind] = useState<'confirm' | 'reset'>('confirm');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Sign-up's required "I'm 13 or older" tick (tester feedback, 2026-11-11). Privacy page: not for under-13s.
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sign-up hit an email that already has an account: the error offers a one-tap switch to Sign In.
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'apple' | null>(null);

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);

  // Reaching the sign-in screen — by any path (onboarding's Skip, finishing step 3, or Profile's
  // Sign In row) — means onboarding is behind us; never show the carousel again on this device.
  useEffect(() => {
    useOnboardingStore.getState().completeOnboarding();
  }, []);

  function goHome() {
    router.replace('/');
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setEmailTaken(false);
    setPassword('');
    setShowPassword(false);
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (mode === 'signUp' && !name.trim()) {
      setError(t('login.enterName'));
      return;
    }
    if (mode === 'reset') {
      if (!trimmedEmail) return setError(t('login.enterEmailOnly'));
    } else if (!trimmedEmail || !password) {
      return setError(t('login.enterEmail'));
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) return setError(t('login.invalidEmail'));
    if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) return setError(t('login.passwordShort'));
    if (mode === 'signUp' && !ageOk) return setError(t('login.age13Required'));

    setError(null);
    setEmailTaken(false);
    setBusy('email');
    const result =
      mode === 'reset'
        ? await sendPasswordReset(trimmedEmail)
        : mode === 'signIn'
          ? await signInWithEmail(trimmedEmail, password)
          : await signUpWithEmail(trimmedEmail, password, name.trim());
    setBusy(null);

    if (result.error) {
      if ('emailTaken' in result && result.emailTaken) setEmailTaken(true);
      setError(result.error);
      return;
    }
    if (mode === 'signUp' || mode === 'reset') {
      setSentKind(mode === 'signUp' ? 'confirm' : 'reset');
      switchMode('sent');
      return;
    }
    goHome();
  }

  async function handleGoogle() {
    // Google can create an account too: on Create Account it needs the same tick; on Sign In the
    // notice under the button covers a first-time Google user.
    if (mode === 'signUp' && !ageOk) return setError(t('login.age13Required'));
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

  const title =
    mode === 'signIn'
      ? t('login.welcome')
      : mode === 'signUp'
        ? t('login.create')
        : mode === 'reset'
          ? t('login.resetTitle')
          : t('login.checkEmailTitle');
  const subtitle =
    mode === 'signIn'
      ? t('login.signInSub')
      : mode === 'signUp'
        ? t('login.signUpSub')
        : mode === 'reset'
          ? t('login.resetSub')
          : t(sentKind === 'confirm' ? 'login.confirmSent' : 'login.resetSent', { email: email.trim() });
  const submitLabel = mode === 'signIn' ? t('login.signIn') : mode === 'signUp' ? t('login.createAccount') : t('login.sendLink');
  const showsAccountOptions = mode === 'signIn' || mode === 'signUp';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.screen, { backgroundColor: theme.surface, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <Tickle size={52} mood="idle" animated />
            {fromProfile && (
              <Pressable
                onPress={() => router.back()}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.bg, opacity: pressed ? 0.6 : 1 }]}>
                <XIcon size={16} color={theme.textSecondary} strokeWidth={2.4} />
              </Pressable>
            )}
          </View>

          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          </View>

          {mode !== 'sent' && (
            <View style={styles.fields}>
              {mode === 'signUp' && (
                <View style={[styles.field, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
                  <TextInput
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setError(null);
                    }}
                    placeholder={t('login.name')}
                    placeholderTextColor={theme.textTertiary}
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    accessibilityLabel={t('login.name')}
                    style={[styles.input, { color: theme.text }]}
                  />
                </View>
              )}
              <View style={[styles.field, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  placeholder={t('login.email')}
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType={mode === 'signUp' ? 'emailAddress' : 'username'}
                  keyboardType="email-address"
                  returnKeyType={mode === 'reset' ? 'send' : 'next'}
                  submitBehavior={mode === 'reset' ? 'blurAndSubmit' : 'submit'}
                  onSubmitEditing={() => (mode === 'reset' ? handleSubmit() : passwordRef.current?.focus())}
                  accessibilityLabel={t('login.email')}
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
              {mode !== 'reset' && (
                <View style={[styles.field, styles.fieldRow, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setError(null);
                    }}
                    placeholder={t('login.password')}
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry={!showPassword}
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
                    returnKeyType="go"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={handleSubmit}
                    accessibilityLabel={t('login.password')}
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
              )}
              {mode === 'signUp' && <Text style={[styles.hint, { color: theme.textTertiary }]}>{t('login.passwordHint')}</Text>}
              {mode === 'signUp' && (
                <Pressable
                  onPress={() => {
                    setAgeOk((v) => !v);
                    setError(null);
                  }}
                  hitSlop={6}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ageOk }}
                  style={({ pressed }) => [styles.ageRow, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                  <View
                    style={[
                      styles.ageBox,
                      { borderColor: ageOk ? theme.accentFill : theme.dividerStrong, backgroundColor: ageOk ? theme.accentFill : theme.surface },
                    ]}>
                    {ageOk && <CheckIcon size={13} color={theme.onAccent} strokeWidth={3} />}
                  </View>
                  <Text style={[styles.ageLabel, { color: theme.text }]}>{t('login.age13')}</Text>
                </Pressable>
              )}
            </View>
          )}

          {error && emailTaken ? (
            // Keeps the typed email, clears the password and moves the cursor there.
            <Pressable
              onPress={() => {
                switchMode('signIn');
                setTimeout(() => passwordRef.current?.focus(), 50);
              }}
              accessibilityRole="button"
              accessibilityLiveRegion="polite"
              style={styles.errorLink}>
              <Text style={[styles.error, { color: theme.danger, marginTop: 0 }]}>
                {t('login.emailTaken')}
                <Text style={{ color: theme.accentStrong, fontWeight: '700' }}>{t('login.signInInstead')}</Text>
              </Text>
            </Pressable>
          ) : (
            error && (
              <Text style={[styles.error, { color: theme.danger }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
                {error}
              </Text>
            )
          )}

          {mode === 'sent' ? (
            <Pressable
              onPress={() => switchMode('signIn')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accentFill, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>{t('login.backToSignInButton')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityState={{ busy: busy === 'email' }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.accentFill, opacity: busy && busy !== 'email' ? 0.5 : pressed ? 0.85 : 1 },
              ]}>
              {busy === 'email' ? <ActivityIndicator color={theme.onAccent} /> : <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>{submitLabel}</Text>}
            </Pressable>
          )}

          {showsAccountOptions && (
            <View style={styles.linkRow}>
              <Pressable onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={8} accessibilityRole="button" style={styles.linkHit}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.body }}>
                  {mode === 'signIn' ? t('login.noAccount') : t('login.haveAccount')}
                  <Text style={{ color: theme.accentStrong, fontWeight: '700' }}>{mode === 'signIn' ? t('login.createOne') : t('login.logIn')}</Text>
                </Text>
              </Pressable>
              {mode === 'signIn' && (
                <Pressable onPress={() => switchMode('reset')} hitSlop={8} accessibilityRole="button" style={styles.linkHit}>
                  <Text style={{ color: theme.accentStrong, fontSize: Typography.body, fontWeight: '600' }}>{t('login.forgot')}</Text>
                </Pressable>
              )}
            </View>
          )}

          {mode === 'reset' && (
            <Pressable onPress={() => switchMode('signIn')} hitSlop={8} accessibilityRole="button" style={styles.centerLink}>
              <Text style={{ color: theme.accentStrong, fontSize: Typography.body, fontWeight: '600' }}>{t('login.backToSignIn')}</Text>
            </Pressable>
          )}

          {showsAccountOptions && (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
                <Text style={[styles.dividerLabel, { color: theme.textTertiary, letterSpacing: lang() === 'en' ? 0.6 : 0 }]}>{t('login.or')}</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
              </View>

              <Pressable
                onPress={handleGoogle}
                disabled={busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.oauthButton,
                  { backgroundColor: theme.surface, borderColor: theme.cardBorder, opacity: busy && busy !== 'google' ? 0.5 : pressed ? 0.7 : 1 },
                ]}>
                {busy === 'google' ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <>
                    <GoogleLogoIcon size={18} />
                    <Text style={[styles.oauthButtonText, { color: theme.text }]}>{t('login.google')}</Text>
                  </>
                )}
              </Pressable>

              {mode === 'signIn' && <Text style={[styles.ageNotice, { color: theme.textTertiary }]}>{t('login.age13Notice')}</Text>}

              {SHOW_APPLE_SIGN_IN && (
                <Pressable
                  onPress={() => {}}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  style={[styles.oauthButton, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <AppleLogoIcon size={18} color={theme.text} />
                  <Text style={[styles.oauthButtonText, { color: theme.text }]}>{t('login.apple')}</Text>
                </Pressable>
              )}

              {!fromProfile && (
                <Pressable onPress={handleGuest} hitSlop={6} accessibilityRole="button" style={styles.guestLink}>
                  <Text style={{ color: theme.accentStrong, fontSize: Typography.body, fontWeight: '600' }}>{t('login.guest')}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>

        <Toast message={toastMessage} kind={toastKind} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'flex-start', gap: 8, marginBottom: 22 },
  title: { fontSize: Typography.screenTitle, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: -0.3 },
  subtitle: { fontSize: Typography.body, fontWeight: '500', fontFamily: Fonts[500], lineHeight: 19 },
  fields: { gap: 10, marginBottom: 4 },
  field: { height: 52, borderRadius: 16, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  input: { fontSize: Typography.heading, fontWeight: '400' },
  toggleText: { fontSize: Typography.body, fontWeight: '600', fontFamily: Fonts[600] },
  hint: { fontSize: Typography.body, marginHorizontal: 4, marginTop: -2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 4, marginTop: 4, alignSelf: 'flex-start' },
  ageBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  ageLabel: { fontSize: Typography.body },
  ageNotice: { fontSize: Typography.label, textAlign: 'center', marginTop: 10 },
  error: { fontSize: Typography.body, fontWeight: '600', lineHeight: 19, marginTop: 8, marginHorizontal: 2 },
  errorLink: { minHeight: 44, justifyContent: 'center', marginTop: 2 },
  primaryButton: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingVertical: 4 },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  centerLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: Typography.label, fontWeight: '700' },
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
  guestLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 12 },
});
