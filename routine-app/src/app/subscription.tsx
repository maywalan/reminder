import { showManageSubscriptionsIOS, useIAP } from 'expo-iap';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { ChevronLeftIcon } from '@/components/icon';
import { Typography } from '@/constants/theme';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { refreshSubscriptionState } from '@/lib/iap';
import { usePlannerStore } from '@/store/use-planner-store';
import { countActivePlans } from '@/utils/premium';
import { getSubscriptionContent } from '@/utils/subscription';
import { t } from '@/i18n';
import { fmtDate } from '@/i18n/format';
import { fromISO } from '@/utils/dates';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

// Entrance stagger (design_handoff_tickle_subscription/README.md "Motion"): hero -> included list
// -> billing card -> CTA -> footer, 140ms apart from 110ms.
const ENTER_DELAY = { hero: 110, list: 250, billing: 390, cta: 530, footer: 650 };

function useEntrance(delayMs: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(v, { toValue: 1, duration: 500, easing: EASE, useNativeDriver: true }).start();
    }, delayMs);
    return () => clearTimeout(t);
  }, [v, delayMs]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }) }] };
}

/** Meter bar fills 0 -> target width, 600ms, starting once the hero card has landed. */
function useMeterFill(pct: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(v, { toValue: pct, duration: 600, easing: EASE, useNativeDriver: false }).start();
    }, ENTER_DELAY.hero + 500);
    return () => clearTimeout(t);
  }, [pct, v]);
  return v;
}

async function openSubscriptionManagement() {
  if (Platform.OS === 'ios') {
    try {
      // Apple's in-app sheet; resolves once it's dismissed, so re-read the entitlement right away
      // (a cancel shows up as 'ending' without leaving the app).
      await showManageSubscriptionsIOS();
      await refreshSubscriptionState();
      return;
    } catch {
      // Sheet unavailable — fall back to the App Store page below.
    }
  }
  const url =
    Platform.OS === 'ios' ? 'itms-apps://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';
  Linking.openURL(url).catch(() => {});
}

function fmtDateLong(iso: string) {
  const d = fromISO(iso.slice(0, 10));
  return fmtDate(d, { year: true }, 'dm');
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toastMessage, showToast } = useToast();

  const state = usePlannerStore((s) => s.mockSubscriptionState);
  const setSubscriptionTestOverride = usePlannerStore((s) => s.setSubscriptionTestOverride);
  const firstUsedAt = usePlannerStore((s) => s.firstUsedAt);
  const details = usePlannerStore((s) => s.subscriptionDetails);
  const plans = usePlannerStore((s) => s.plans);
  const content = getSubscriptionContent(state, { details, activePlans: countActivePlans(plans) });
  const memberSince = firstUsedAt ? fmtDateLong(firstUsedAt) : '—';

  const { restorePurchases } = useIAP();

  useEffect(() => {
    refreshSubscriptionState();
  }, []);

  const heroEnter = useEntrance(ENTER_DELAY.hero);
  const listEnter = useEntrance(ENTER_DELAY.list);
  const billingEnter = useEntrance(ENTER_DELAY.billing);
  const ctaEnter = useEntrance(ENTER_DELAY.cta);
  const footerEnter = useEntrance(ENTER_DELAY.footer);
  const meterFill = useMeterFill(content.pct);

  function handlePrimary() {
    if (content.ctaAction === 'paywall') {
      router.push('/paywall');
      return;
    }
    openSubscriptionManagement();
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      setSubscriptionTestOverride(false);
      await refreshSubscriptionState();
      const has = usePlannerStore.getState().mockSubscriptionState !== 'free';
      showToast(t(has ? 'restore.done' : 'restore.none'));
    } catch {
      showToast(t('restore.failed'));
    }
  }

  function handleMinor() {
    if (content.minorAction === 'store') {
      openSubscriptionManagement();
      return;
    }
    if (content.minorAction === 'restore') {
      handleRestore();
      return;
    }
    Alert.alert(t('sub.freeChangesTitle'), t('sub.freeChangesBody'));
  }

  const heroInk = content.dark ? '#FFFFFF' : '#10203A';
  const heroInkSoft = content.dark ? '#C6D6EA' : '#5A6A80';
  const trackColor = content.dark ? 'rgba(255,255,255,0.14)' : '#EEF3FA';
  const dotBg = content.listGrey ? '#EEF3FA' : '#1B76E8';
  const dotColor = content.listGrey ? '#8A99AC' : '#fff';
  const rowInk = content.listGrey ? '#5A6A80' : '#3A4759';
  const barWidth = meterFill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeftIcon size={14} color="#3A4759" strokeWidth={2.6} />
        </Pressable>
        <Text style={styles.navTitle}>{t('sub.title')}</Text>
      </View>

      <View style={styles.body}>
        <Animated.View style={heroEnter}>
          <View style={[styles.hero, content.dark ? styles.heroDark : styles.heroLight]}>
            <View style={styles.heroTop}>
              <View style={styles.heroTopText}>
                <View style={[styles.pill, { backgroundColor: content.pillBg }]}>
                  <Text style={[styles.pillText, { color: content.pillInk }]}>{content.pillLabel}</Text>
                </View>
                <Text style={[styles.planName, { color: heroInk }]}>{content.planName}</Text>
                <Text style={[styles.priceLine, { color: heroInkSoft }]}>{content.priceLine}</Text>
              </View>
              <Tickle size={46} mood="idle" animated />
            </View>
            <View style={styles.meter}>
              <View style={styles.meterLabelRow}>
                <Text style={[styles.meterLabel, { color: heroInkSoft }]}>{content.meterLabel}</Text>
                <Text style={[styles.meterValue, { color: heroInkSoft }]}>{content.meterValue}</Text>
              </View>
              <View style={[styles.meterTrack, { backgroundColor: trackColor }]}>
                <Animated.View style={[styles.meterBar, { width: barWidth, backgroundColor: content.barColor }]} />
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, listEnter]}>
          <Text style={styles.cardTitle}>{content.listTitle}</Text>
          <View style={styles.featureList}>
            {[t('sub.feature.plans'), t('sub.feature.calendar'), t('sub.feature.reminders')].map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: dotBg }]}>
                  <Text style={[styles.featureDotMark, { color: dotColor }]}>✓</Text>
                </View>
                <Text style={[styles.featureText, { color: rowInk }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, styles.billingCard, billingEnter]}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{t('sub.plan')}</Text>
            <Text style={styles.billValue}>{content.billPlan}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{t('sub.nextCharge')}</Text>
            <Text style={styles.billValueMono}>{content.billNext}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{t('sub.billedBy')}</Text>
            <Text style={styles.billValue}>{content.billPay}</Text>
          </View>
          <View style={[styles.billRow, styles.billRowLast]}>
            <Text style={styles.billLabel}>{t('sub.memberSince')}</Text>
            <Text style={styles.billValueMono}>{memberSince}</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={ctaEnter}>
        <Pressable onPress={handlePrimary} style={styles.ctaBtn}>
          <Text style={styles.ctaLabel}>{content.ctaLabel}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={footerEnter}>
        <Pressable onPress={handleMinor} hitSlop={6} style={styles.minorBtn}>
          <Text style={[styles.minorLabel, { color: content.minorInk }]}>{content.minorLabel}</Text>
        </Pressable>
        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestore} hitSlop={6}>
            <Text style={styles.footerLink}>{t('legal.restore')}</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => showToast(t('legal.termsSoon'))} hitSlop={6}>
            <Text style={styles.footerLink}>{t('legal.terms')}</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => Linking.openURL('https://maywalan.github.io/reminder/privacy.html')} hitSlop={6}>
            <Text style={styles.footerLink}>{t('legal.privacy')}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <Toast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAFF', paddingHorizontal: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(16,32,58,0.06)', alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontWeight: '700', fontSize: Typography.title, color: '#10203A', letterSpacing: -0.2 },

  body: { flex: 1, gap: 11 },

  hero: { borderRadius: 22, padding: 16, gap: 14 },
  heroDark: { backgroundColor: '#10203A', shadowColor: '#10203A', shadowOpacity: 0.24, shadowRadius: 30, shadowOffset: { width: 0, height: 14 } },
  heroLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7EDF6', shadowColor: '#10203A', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroTopText: { flex: 1, minWidth: 0, gap: 7 },
  pill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 9 },
  pillText: { fontWeight: '700', fontSize: Typography.caption, letterSpacing: 0.4 },
  planName: { fontWeight: '700', fontSize: Typography.screenTitle },
  priceLine: { fontWeight: '500', fontSize: Typography.body, fontVariant: ['tabular-nums'] },

  meter: { gap: 7 },
  meterLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterLabel: { fontWeight: '500', fontSize: Typography.rowValue, flexShrink: 1, marginRight: 8 },
  meterValue: { fontWeight: '600', fontSize: Typography.rowValue, fontVariant: ['tabular-nums'] },
  meterTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  meterBar: { height: '100%', borderRadius: 3 },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7EDF6', borderRadius: 20, padding: 14, gap: 10 },
  cardTitle: { fontWeight: '700', fontSize: Typography.heading, color: '#10203A' },
  featureList: { gap: 9 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  featureDotMark: { fontSize: Typography.caption, fontWeight: '700' },
  featureText: { fontWeight: '500', fontSize: Typography.rowLabel, flex: 1 },

  billingCard: { paddingVertical: 0, paddingHorizontal: 14, gap: 0 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5FB' },
  billRowLast: { borderBottomWidth: 0 },
  billLabel: { fontWeight: '500', fontSize: Typography.rowLabel, color: '#5A6A80' },
  billValue: { fontWeight: '600', fontSize: Typography.rowValue, color: '#10203A' },
  billValueMono: { fontWeight: '600', fontSize: Typography.rowValue, fontVariant: ['tabular-nums'], color: '#10203A' },

  ctaBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B76E8', shadowColor: '#1B76E8', shadowOpacity: 0.3, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, marginTop: 12, marginBottom: 10 },
  ctaLabel: { color: '#fff', fontWeight: '700', fontSize: Typography.heading },

  minorBtn: { alignItems: 'center', paddingVertical: 4 },
  minorLabel: { fontWeight: '600', fontSize: Typography.rowLabel },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 9 },
  footerLink: { fontWeight: '500', fontSize: Typography.body, color: '#5A6A80' },
  footerDot: { fontSize: Typography.body, color: '#5A6A80' },
});
