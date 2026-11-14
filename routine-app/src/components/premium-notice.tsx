import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/text';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { fmtDate } from '@/i18n/format';
import { usePlannerStore } from '@/store/use-planner-store';
import { calendarDaysUntil, FREE_ACTIVE_PLAN_LIMIT, PREMIUM_ENDING_WINDOW_DAYS } from '@/utils/premium';

/** Stand-in for the date inside the translated sentence, so it can be styled on its own. */
const DATE_MARK = '\u0001';
const TAB_PATHS = new Set(['/', '/calendar', '/progress', '/profile']);

type Notice = { kind: 'ended' } | { kind: 'ending'; key: string; days: number; expiresAt: number };

/**
 * Premium expiry notes (2026-11-14):
 * - A cancelled Premium ('ending') reminds the user 7, 3 and 1 day(s) before it runs out.
 * - Once Premium goes back to Free, a one-time note says all plans are safe and how the limit works.
 * Shown over the tabs only, never on top of a form or the paywall. Mounted in the tabs layout.
 */
export function PremiumNotice() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const state = usePlannerStore((s) => s.mockSubscriptionState);
  const expiresAt = usePlannerStore((s) => s.subscriptionDetails?.expiresAt ?? null);
  const endedPending = usePlannerStore((s) => s.premiumEndedPending);
  const seenKey = usePlannerStore((s) => s.premiumEndingNoticeKey);
  const dismissEnded = usePlannerStore((s) => s.dismissPremiumEnded);
  const setSeenKey = usePlannerStore((s) => s.setPremiumEndingNoticeKey);
  const [now, setNow] = useState(() => new Date());
  const [shown, setShown] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);

  // Re-check the day count when the app comes back (it may have sat in the background for days).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  let due: Notice | null = null;
  if (endedPending) due = { kind: 'ended' };
  else if (state === 'ending' && expiresAt != null && expiresAt > now.getTime()) {
    const days = calendarDaysUntil(expiresAt, now);
    const bucket = days <= 1 ? 1 : days <= 3 ? 3 : 7;
    const key = `${expiresAt}:${bucket}`;
    if (days <= PREMIUM_ENDING_WINDOW_DAYS && key !== seenKey) due = { kind: 'ending', key, days, expiresAt };
  }
  const onTabs = TAB_PATHS.has(pathname);

  // Snapshot what's on screen so the copy doesn't change while the sheet animates away. Opens after a
  // short pause: iOS can't present it while another sheet is still closing, and it shouldn't pop up
  // the instant the app opens.
  useEffect(() => {
    if (!due || !onTabs || open) return;
    const next = due;
    const timer = setTimeout(() => {
      setShown(next);
      setOpen(true);
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due?.kind, due && due.kind === 'ending' ? due.key : null, onTabs]);

  function markSeen() {
    if (!shown) return;
    if (shown.kind === 'ended') dismissEnded();
    else setSeenKey(shown.key);
  }

  function close() {
    markSeen();
    setOpen(false);
  }

  function go(path: '/paywall' | '/subscription') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    close();
    router.push(path);
  }

  if (!shown) return null;
  const ended = shown.kind === 'ended';
  const title = ended
    ? t('premiumNotice.endedTitle')
    : shown.days <= 0
      ? t('premiumNotice.endingToday')
      : t('premiumNotice.endingTitle', { count: shown.days });
  const body = ended
    ? t('premiumNotice.endedBody', { limit: FREE_ACTIVE_PLAN_LIMIT })
    : t('premiumNotice.endingBody', { date: DATE_MARK, limit: FREE_ACTIVE_PLAN_LIMIT });
  // The end date is the one thing to remember here, so it's bold and full-strength (user, 2026-11-14).
  const [before, after] = body.split(DATE_MARK);
  const dateText = ended ? '' : fmtDate(new Date(shown.expiresAt), { weekday: 'long', month: 'long' });

  return (
    <BottomSheet visible={open} onClose={close} title={title}>
      <View style={styles.body}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>
          {ended ? (
            body
          ) : (
            <>
              {before}
              <Text style={[styles.date, { color: theme.text }]}>{dateText}</Text>
              {after}
            </>
          )}
        </Text>
        <Pressable
          onPress={ended ? close : () => go('/subscription')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accentFill, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>{t(ended ? 'premiumNotice.gotIt' : 'sub.keepPremium')}</Text>
        </Pressable>
        <Pressable
          onPress={ended ? () => go('/paywall') : close}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.secondaryText, { color: theme.accentStrong }]}>
            {t(ended ? 'premiumNotice.seePremium' : 'premiumNotice.notNow')}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 6, paddingBottom: 8 },
  text: { fontSize: Typography.heading, lineHeight: Typography.heading * 1.5, textAlign: 'center', marginBottom: 20 },
  date: { fontWeight: '700' },
  primary: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: Typography.heading, fontWeight: '700' },
  secondary: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 },
  secondaryText: { fontSize: Typography.heading, fontWeight: '600' },
});
