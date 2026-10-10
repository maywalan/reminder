import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { XIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { Tickle } from '@/components/tickle';
import { Typography } from '@/constants/theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { countActivePlans, FREE_ACTIVE_PLAN_LIMIT } from '@/utils/premium';

/** design canvas "Tickle upgrade banner" — the paywall's Premium-card ink, same on light and dark. */
const INK = '#10203A';
const MUTED_ON_INK = '#C6D6EA';
const GOLD = '#EFC985';
const GOLD_TINT = 'rgba(184,134,43,0.2)';
const AZURE = '#1B76E8';

const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
/** From this many active plans the banner switches to the "N of 5 used" meter and ignores a dismiss. */
const NEAR_LIMIT_AT = 4;

const ENTER_SPRING = { damping: 14, stiffness: 170 };

/**
 * Profile's paywall entry point for Free users. Variant "pitch" by default; "near limit" (a 5-segment
 * plan meter) once they're at 4+ active plans. The ✕ hides it for 7 days, unless they reach the
 * near-limit point sooner.
 */
export function UpgradeBanner() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const subscriptionState = usePlannerStore((s) => s.mockSubscriptionState);
  const plans = usePlannerStore((s) => s.plans);
  const dismissedAt = usePlannerStore((s) => s.upgradeBannerDismissedAt);
  const dismissUpgradeBanner = usePlannerStore((s) => s.dismissUpgradeBanner);

  const activeCount = useMemo(() => countActivePlans(plans), [plans]);
  const nearLimit = activeCount >= NEAR_LIMIT_AT;
  const dismissed = dismissedAt !== null && Date.now() - dismissedAt < DISMISS_FOR_MS;
  const visible = subscriptionState === 'free' && (!dismissed || nearLimit);

  // Dismiss: fade + collapse the measured height so the rows below slide up, then persist it.
  const [height, setHeight] = useState<number | null>(null);
  const collapse = useSharedValue(1);
  const collapseStyle = useAnimatedStyle(() =>
    height === null ? {} : { height: height * collapse.value, opacity: collapse.value, overflow: 'hidden' }
  );
  useEffect(() => {
    if (visible) collapse.value = 1;
  }, [visible, collapse]);

  function handleDismiss() {
    if (reduceMotion || height === null) {
      dismissUpgradeBanner();
      return;
    }
    collapse.value = withTiming(0, { duration: 260 }, (done) => {
      if (done) runOnJS(dismissUpgradeBanner)();
    });
  }

  if (!visible) return null;

  const openPaywall = () => router.push('/paywall');
  const used = Math.min(activeCount, FREE_ACTIVE_PLAN_LIMIT);

  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(ENTER_SPRING.damping).stiffness(ENTER_SPRING.stiffness)}
      style={[styles.wrap, collapseStyle]}>
      <View onLayout={(e) => height === null && setHeight(e.nativeEvent.layout.height)}>
        <BouncyPressable
          onPress={openPaywall}
          pressedScale={0.96}
          accessibilityRole="button"
          accessibilityLabel={nearLimit ? `${t('banner.title')}. ${t('banner.used', { used, limit: FREE_ACTIVE_PLAN_LIMIT })}` : t('banner.title')}
          style={styles.card}>
          <View style={styles.top}>
            <View style={styles.mascotTile}>
              <Tickle size={34} mood="idle" animated />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.trialPill}>
                <Text style={styles.trialText}>{t('paywall.trialBadge')}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {t('banner.title')}
              </Text>
              <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {nearLimit ? t('banner.used', { used, limit: FREE_ACTIVE_PLAN_LIMIT }) : t('banner.sub')}
              </Text>
            </View>
          </View>

          {nearLimit && (
            <View style={styles.meter}>
              {Array.from({ length: FREE_ACTIVE_PLAN_LIMIT }, (_, i) => (
                <MeterSegment key={i} filled={i < used} index={i} reduceMotion={reduceMotion} />
              ))}
            </View>
          )}

          <BouncyPressable onPress={openPaywall} pressedScale={0.96} style={styles.cta}>
            <Text style={styles.ctaText}>{t('paywall.cta.trial')}</Text>
          </BouncyPressable>
        </BouncyPressable>

        <Pressable onPress={handleDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.dismiss')} style={styles.close}>
          <XIcon size={12} color={MUTED_ON_INK} strokeWidth={2.6} />
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

/** Fills left to right, 60ms apart, the first time the meter shows. */
function MeterSegment({ filled, index, reduceMotion }: { filled: boolean; index: number; reduceMotion: boolean }) {
  const fill = useSharedValue(reduceMotion || !filled ? (filled ? 1 : 0) : 0);
  useEffect(() => {
    const target = filled ? 1 : 0;
    fill.value = reduceMotion ? target : withDelay(180 + index * 60, withSpring(target, { damping: 16, stiffness: 180 }));
  }, [filled, index, reduceMotion, fill]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View style={styles.segment}>
      <Reanimated.View style={[styles.segmentFill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 20 },
  card: {
    padding: 16,
    gap: 12,
    borderRadius: 20,
    backgroundColor: INK,
    shadowColor: INK,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 22 },
  mascotTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialPill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 9, backgroundColor: GOLD_TINT },
  trialText: { color: GOLD, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: '#FFFFFF', fontSize: Typography.sheetTitle, fontWeight: '700', marginTop: 5 },
  sub: { color: MUTED_ON_INK, fontSize: Typography.body, fontWeight: '500', marginTop: 2 },
  meter: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  segmentFill: { ...StyleSheet.absoluteFillObject, backgroundColor: GOLD, transformOrigin: 'left' },
  cta: { height: 44, borderRadius: 22, backgroundColor: AZURE, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: Typography.heading, fontWeight: '700' },
  close: { position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
