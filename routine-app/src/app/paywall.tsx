import * as Haptics from 'expo-haptics';
import { finishTransaction, useIAP } from 'expo-iap';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { CheckIcon, XIcon } from '@/components/icon';
import { Typography } from '@/constants/theme';
import { t } from '@/i18n';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { PREMIUM_SKUS, refreshSubscriptionState } from '@/lib/iap';
import { usePlannerStore } from '@/store/use-planner-store';
import { useThink } from '@/utils/motion';

type Billing = 'monthly' | 'annual';
type Currency = 'usd' | 'thb';
type Tier = 'free' | 'premium';
type CtaState = 'idle' | 'loading' | 'done';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

const FREE_FEATURES = ['feature.free.plans', 'feature.free.repeat', 'feature.free.calendar', 'feature.free.reminder', 'feature.free.today', 'feature.free.widgets'] as const;
const PREMIUM_FEATURES = ['feature.pro.plans', 'feature.pro.repeat', 'feature.pro.calendar', 'feature.pro.reminders', 'feature.pro.history', 'feature.pro.themes'] as const;

// Display-conversion fallback copy (design_handoff_tickle_paywall/README.md) for when a real
// storefront hasn't loaded yet — the live screen must read localized prices from StoreKit / Play
// Billing instead of these once purchases are wired up.
const PRICE: Record<Currency, Record<Billing, string>> = {
  usd: { monthly: '$2.69', annual: '$16.99' },
  thb: { monthly: '฿89', annual: '฿555' },
};
const PER_MONTH: Record<Currency, string> = { usd: '$1.42', thb: '฿46.25' };

function periodLine(currency: Currency, billing: Billing) {
  return billing === 'monthly' ? t('paywall.perMonth') : t('paywall.perYear', { mo: PER_MONTH[currency] });
}

function finePrint(currency: Currency, billing: Billing) {
  const price = PRICE[currency][billing];
  const base = billing === 'monthly' ? t('paywall.fine.monthly', { price }) : t('paywall.fine.annual', { price, mo: PER_MONTH[currency] });
  return currency === 'thb' ? `${base} ${t('paywall.fine.localNote')}` : base;
}

// Entrance stagger (design_handoff_tickle_paywall/README.md "Motion"): header -> toggle ->
// Premium -> Free -> CTA -> fine print, 140ms apart starting at 120ms.
const ENTER_DELAY = { header: 120, toggle: 260, premium: 400, free: 540, cta: 680, fine: 800 };

function useEntrance(delayMs: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(v, { toValue: 1, duration: 520, easing: EASE, useNativeDriver: true }).start();
    }, delayMs);
    return () => clearTimeout(t);
  }, [v, delayMs]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
}

/** Selected card lifts 2px, 260ms — the cross-fade beat from the Motion table. */
function useLift(active: boolean) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: active ? 1 : 0, duration: 260, easing: EASE, useNativeDriver: true }).start();
  }, [active, v]);
  return { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] };
}

/** RECOMMENDED tag's ambient pulse — 3.2s, +scale/-translateY at the peak. */
function useBadgePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1600, easing: EASE, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1600, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return {
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
    ],
  };
}

function PlanCheck({ selected, dark }: { selected: boolean; dark: boolean }) {
  return (
    <View
      style={[
        styles.check,
        selected
          ? { backgroundColor: '#1B76E8', borderColor: '#1B76E8' }
          : { backgroundColor: 'transparent', borderColor: dark ? 'rgba(255,255,255,0.3)' : '#D5E2F5' },
      ]}>
      {selected && <CheckIcon size={11} color="#fff" strokeWidth={3.2} />}
    </View>
  );
}

function FeatureRow({ text, dark }: { text: string; dark: boolean }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureTick, { backgroundColor: dark ? '#1B76E8' : '#EAF2FE' }]}>
        <CheckIcon size={8} color={dark ? '#fff' : '#1B76E8'} strokeWidth={3.4} />
      </View>
      <Text style={[styles.featureText, { color: dark ? '#F2F7FD' : '#3A4759' }]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toastMessage, showToast } = useToast();

  const [tier, setTier] = useState<Tier>('premium');
  const [billing, setBilling] = useState<Billing>('annual');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [cta, setCta] = useState<CtaState>('idle');
  const [trackWidth, setTrackWidth] = useState(0);

  const setSubscriptionTestOverride = usePlannerStore((s) => s.setSubscriptionTestOverride);
  const { requestPurchase, restorePurchases } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      await finishTransaction({ purchase, isConsumable: false });
      // A real purchase wins over any testing override; StoreKit then decides trial vs paid.
      setSubscriptionTestOverride(false);
      await refreshSubscriptionState();
      setCta('done');
    },
    onPurchaseError: (error) => {
      setCta('idle');
      showToast(error.message || t('paywall.purchaseFailed'));
    },
  });

  const headerEnter = useEntrance(ENTER_DELAY.header);
  const toggleEnter = useEntrance(ENTER_DELAY.toggle);
  const premiumEnter = useEntrance(ENTER_DELAY.premium);
  const freeEnter = useEntrance(ENTER_DELAY.free);
  const ctaEnter = useEntrance(ENTER_DELAY.cta);
  const fineEnter = useEntrance(ENTER_DELAY.fine);

  const premiumLift = useLift(tier === 'premium');
  const freeLift = useLift(tier === 'free');
  const badgePulse = useBadgePulse();
  const thinkDots = useThink(cta === 'loading');

  const thumbX = useRef(new Animated.Value(billing === 'annual' ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(thumbX, { toValue: billing === 'annual' ? 1 : 0, duration: 320, easing: EASE, useNativeDriver: true }).start();
  }, [billing, thumbX]);

  const mascotHop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (cta !== 'done') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    mascotHop.setValue(0);
    Animated.timing(mascotHop, { toValue: 1, duration: 900, easing: Easing.bezier(0.3, 1.2, 0.4, 1), useNativeDriver: true }).start();
    const t = setTimeout(() => router.back(), 1000);
    return () => clearTimeout(t);
  }, [cta, mascotHop, router]);

  function selectTier(next: Tier) {
    if (next === tier) return;
    Haptics.selectionAsync();
    setTier(next);
  }

  function selectBilling(next: Billing) {
    if (next === billing) return;
    Haptics.selectionAsync();
    setBilling(next);
  }

  function selectCurrency(next: Currency) {
    if (next === currency) return;
    Haptics.selectionAsync();
    setCurrency(next);
  }

  async function handlePrimaryPress() {
    if (tier === 'free') {
      router.back();
      return;
    }
    if (cta !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCta('loading');
    try {
      // Result arrives async via onPurchaseSuccess/onPurchaseError above, not this promise.
      await requestPurchase({ request: { apple: { sku: PREMIUM_SKUS[billing] } }, type: 'subs' });
    } catch (e) {
      setCta('idle');
      showToast(e instanceof Error ? e.message : t('paywall.purchaseFailed'));
    }
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

  const segWidth = trackWidth > 0 ? (trackWidth - 8) / 2 : 0;
  const thumbTranslate = thumbX.interpolate({ inputRange: [0, 1], outputRange: [0, segWidth] });

  const ctaLabel = cta === 'done' ? t('paywall.cta.done') : tier === 'premium' ? t('paywall.cta.trial') : t('paywall.cta.free');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.utilityRow}>
        <View style={styles.currencyPill}>
          <Pressable onPress={() => selectCurrency('usd')} style={[styles.pillBtn, currency === 'usd' && styles.pillBtnActive]}>
            <Text style={[styles.pillLabel, currency === 'usd' && styles.pillLabelActive]}>USD</Text>
          </Pressable>
          <Pressable onPress={() => selectCurrency('thb')} style={[styles.pillBtn, currency === 'thb' && styles.pillBtnActive]}>
            <Text style={[styles.pillLabel, currency === 'thb' && styles.pillLabelActive]}>THB</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <XIcon size={13} color="rgba(16,32,58,0.5)" strokeWidth={2.4} />
        </Pressable>
      </View>

      <Animated.View style={[styles.header, headerEnter]}>
        <Animated.View style={{ transform: [{ translateY: mascotHop.interpolate({ inputRange: [0, 0.22, 0.45, 0.62, 1], outputRange: [0, -14, 0, -5, 0] }) }] }}>
          <Tickle size={46} mood="idle" animated />
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('paywall.title')}</Text>
          <Text style={styles.headerSub}>{t('paywall.sub')}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.billingTrack, toggleEnter]} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        {segWidth > 0 && <Animated.View style={[styles.billingThumb, { width: segWidth, transform: [{ translateX: thumbTranslate }] }]} />}
        <Pressable style={styles.billingSeg} onPress={() => selectBilling('monthly')}>
          <Text style={[styles.billingLabel, billing === 'monthly' && styles.billingLabelActive]}>{t('paywall.monthly')}</Text>
        </Pressable>
        <Pressable style={styles.billingSeg} onPress={() => selectBilling('annual')}>
          <Text style={[styles.billingLabel, billing === 'annual' && styles.billingLabelActive]}>{t('paywall.annual')}</Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>{t('paywall.save')}</Text>
          </View>
        </Pressable>
      </Animated.View>

      <View style={styles.cardsRow}>
        <Animated.View style={[styles.cardOuter, freeEnter]}>
          <Animated.View style={[styles.cardOuter, freeLift]}>
            <Pressable
              onPress={() => selectTier('free')}
              style={[styles.card, styles.freeCard, tier === 'free' ? styles.freeCardSelected : styles.freeCardUnselected]}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopText}>
                  <Text style={styles.cardName}>{t('paywall.free')}</Text>
                  <Text style={styles.priceLight}>{currency === 'usd' ? '$0' : '฿0'}</Text>
                  <Text style={styles.periodLight}>{t('paywall.forever')}</Text>
                </View>
                <PlanCheck selected={tier === 'free'} dark={false} />
              </View>
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>{t('paywall.yourPlanToday')}</Text>
              </View>
              <View style={styles.dividerLight} />
              <View style={styles.featureList}>
                {FREE_FEATURES.map((f) => (
                  <FeatureRow key={f} text={t(f)} dark={false} />
                ))}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.cardOuter, premiumEnter]}>
          <Animated.View style={[styles.cardOuter, premiumLift]}>
            <Pressable
              onPress={() => selectTier('premium')}
              style={[styles.card, styles.premiumCard, tier === 'premium' ? styles.premiumCardSelected : styles.premiumCardUnselected]}>
              <Animated.View style={[styles.recommendedBadge, badgePulse]}>
                <Text style={styles.recommendedBadgeText}>{t('paywall.recommended')}</Text>
              </Animated.View>
              <View style={styles.cardTop}>
                <View style={styles.cardTopText}>
                  <Text style={styles.cardNameDark}>Premium</Text>
                  <Text style={styles.priceDark}>{PRICE[currency][billing]}</Text>
                  <Text style={styles.periodDark}>{periodLine(currency, billing)}</Text>
                </View>
                <PlanCheck selected={tier === 'premium'} dark />
              </View>
              <View style={styles.badgeWarm}>
                <Text style={styles.badgeWarmText}>{t('paywall.trialBadge')}</Text>
              </View>
              <View style={styles.dividerDark} />
              <View style={styles.featureList}>
                {PREMIUM_FEATURES.map((f) => (
                  <FeatureRow key={f} text={t(f)} dark />
                ))}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={ctaEnter}>
        <Pressable onPress={handlePrimaryPress} style={[styles.ctaBtn, cta === 'done' && styles.ctaBtnDone]}>
          {cta !== 'loading' && <Text style={styles.ctaLabel}>{ctaLabel}</Text>}
          {cta === 'loading' && (
            <View style={styles.dotsRow}>
              {thinkDots.map((dotStyle, i) => (
                <Animated.View key={i} style={[styles.dot, dotStyle]} />
              ))}
            </View>
          )}
        </Pressable>
      </Animated.View>

      <Animated.View style={fineEnter}>
        <Text style={styles.fine}>{finePrint(currency, billing)}</Text>
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
  utilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  currencyPill: { flexDirection: 'row', gap: 2, padding: 3, backgroundColor: '#EAF0F9', borderRadius: 12 },
  pillBtn: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 9 },
  pillBtnActive: { backgroundColor: '#fff', shadowColor: '#10203A', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  pillLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.3, color: 'rgba(16,32,58,0.45)' },
  pillLabelActive: { color: '#10203A' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(16,32,58,0.06)', alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { fontWeight: '700', fontSize: Typography.screenTitle, color: '#10203A', letterSpacing: -0.2 },
  headerSub: { fontWeight: '500', fontSize: Typography.body, color: '#4B5A70' },

  billingTrack: { position: 'relative', flexDirection: 'row', padding: 4, backgroundColor: '#EAF0F9', borderRadius: 16, marginBottom: 10 },
  billingThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#10203A', shadowOpacity: 0.09, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  billingSeg: { flex: 1, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  billingLabel: { fontWeight: '600', fontSize: Typography.body, color: 'rgba(16,32,58,0.5)' },
  billingLabelActive: { color: '#10203A' },
  saveBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 7, backgroundColor: '#F6EBD6' },
  saveBadgeText: { fontSize: Typography.caption, fontWeight: '700', letterSpacing: 0.2, color: '#8C6318' },

  cardsRow: { flex: 1, flexDirection: 'row', gap: 10, marginBottom: 10 },
  cardOuter: { flex: 1, minWidth: 0 },
  card: { flex: 1, minWidth: 0, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 14, gap: 13 },
  freeCard: { backgroundColor: '#fff' },
  freeCardSelected: { borderWidth: 1.5, borderColor: '#1B76E8', shadowColor: '#10203A', shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  freeCardUnselected: { borderWidth: 1, borderColor: '#E7EDF6' },
  premiumCard: { backgroundColor: '#10203A', position: 'relative' },
  premiumCardSelected: { borderWidth: 1.5, borderColor: '#1B76E8', shadowColor: '#10203A', shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 12 } },
  premiumCardUnselected: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#10203A', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },

  recommendedBadge: { position: 'absolute', top: -8, left: 12, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#1B76E8' },
  recommendedBadgeText: { color: '#fff', fontWeight: '700', fontSize: Typography.caption, letterSpacing: 0.3 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  cardTopText: { flex: 1, minWidth: 0, gap: 5 },
  cardName: { fontWeight: '700', fontSize: Typography.heading, color: '#10203A' },
  cardNameDark: { fontWeight: '700', fontSize: Typography.heading, color: '#fff' },
  priceLight: { fontWeight: '700', fontSize: Typography.screenTitle, fontVariant: ['tabular-nums'], color: '#10203A' },
  priceDark: { fontWeight: '700', fontSize: Typography.screenTitle, fontVariant: ['tabular-nums'], color: '#fff' },
  periodLight: { fontWeight: '500', fontSize: Typography.rowValue, color: '#5A6A80' },
  periodDark: { fontWeight: '500', fontSize: Typography.rowValue, color: '#C6D6EA' },

  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  badgeNeutral: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#EEF3FA' },
  badgeNeutralText: { color: '#4B5A70', fontWeight: '700', fontSize: Typography.caption, letterSpacing: 0.2 },
  badgeWarm: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: 'rgba(184,134,43,0.2)' },
  badgeWarmText: { color: '#EFC985', fontWeight: '700', fontSize: Typography.caption, letterSpacing: 0.2 },

  dividerLight: { height: 1, backgroundColor: '#EEF3FA' },
  dividerDark: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },

  featureList: { flex: 1, gap: 7 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  featureTick: { width: 15, height: 15, borderRadius: 8, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontWeight: '500', fontSize: Typography.rowValue, lineHeight: 17 },

  ctaBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B76E8', shadowColor: '#1B76E8', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, marginBottom: 8 },
  ctaBtnDone: { backgroundColor: '#0F5FC4', shadowColor: '#0F5FC4', shadowOpacity: 0.34 },
  ctaLabel: { color: '#fff', fontWeight: '700', fontSize: Typography.heading },
  dotsRow: { flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },

  fine: { fontWeight: '500', fontSize: Typography.label, lineHeight: 16, textAlign: 'center', color: '#5A6A80', marginBottom: 7 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  footerLink: { fontWeight: '500', fontSize: Typography.body, color: 'rgba(16,32,58,0.72)' },
  footerDot: { fontSize: Typography.body, color: 'rgba(16,32,58,0.72)' },
});
