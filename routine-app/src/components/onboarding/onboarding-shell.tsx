import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingStore } from '@/store/use-onboarding-store';

interface OnboardingShellProps {
  step: 0 | 1 | 2;
  illustration: ReactNode;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryBusy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Shared chrome for onboarding steps 1-3 (design_handoff_tickle_draft2, section 01: Skip header,
 * a boxed illustration, headline + body, a 3-dot pager, and a primary button). Skip always exits
 * straight to the sign-in screen (not the design's own "drops to an empty Today" behaviour — a
 * deliberate product call, see project memory) and marks onboarding complete so it never re-shows.
 */
export function OnboardingShell({ step, illustration, title, body, primaryLabel, onPrimary, primaryBusy, secondaryLabel, onSecondary }: OnboardingShellProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleSkip() {
    useOnboardingStore.getState().completeOnboarding();
    router.replace('/login');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.surface, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.head}>
        <Pressable onPress={handleSkip} hitSlop={8}>
          <Text style={[styles.skip, { color: theme.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.middle}>
        {illustration}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.pager}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                i === step ? styles.pagerDotActive : styles.pagerDotInactive,
                { backgroundColor: i === step ? theme.accent : theme.dividerStrong },
              ]}
            />
          ))}
        </View>

        <Pressable onPress={onPrimary} disabled={primaryBusy} style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: primaryBusy ? 0.7 : 1 }]}>
          {primaryBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{primaryLabel}</Text>}
        </Pressable>

        {secondaryLabel && onSecondary && (
          <Pressable onPress={onSecondary} hitSlop={6} style={styles.secondaryButton}>
            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>{secondaryLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  head: { height: 30, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  skip: { fontSize: Typography.body, fontWeight: '600', fontFamily: Fonts[600] },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  copy: { alignItems: 'center', gap: 9, maxWidth: 260 },
  title: { fontSize: 22, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: -0.3, textAlign: 'center', lineHeight: 30 },
  body: { fontSize: Typography.body + 0.5, fontWeight: '500', fontFamily: Fonts[500], textAlign: 'center', lineHeight: 20 },
  footer: { gap: 16 },
  pager: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  pagerDotActive: { width: 22, height: 6, borderRadius: 3 },
  pagerDotInactive: { width: 6, height: 6, borderRadius: 3 },
  primaryButton: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700', fontFamily: Fonts[700] },
  secondaryButton: { height: 22, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: Typography.heading, fontWeight: '600', fontFamily: Fonts[600] },
});
