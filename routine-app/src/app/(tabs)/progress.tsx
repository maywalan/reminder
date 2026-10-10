import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { BouncyPressable } from '@/components/bouncy-pressable';
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, SparkleIcon } from '@/components/icon';
import { ProgressCategories } from '@/components/progress/progress-categories';
import { ProgressChart } from '@/components/progress/progress-chart';
import { ProgressHero } from '@/components/progress/progress-hero';
import { ProgressStats } from '@/components/progress/progress-stats';
import { ProgressStreakCard } from '@/components/progress/progress-streak-card';
import { SegmentedControl } from '@/components/segmented-control';
import { Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';
import { t } from '@/i18n';
import { weekdayShort } from '@/i18n/format';
import { toISO } from '@/utils/dates';
import { isPeriodLocked } from '@/utils/premium';
import {
  bestWeekday,
  colorBreakdown,
  currentStreak,
  datesInRange,
  formatPeriodLabel,
  heroEyebrow,
  longestStreak,
  pctDelta,
  previousPeriodLabel,
  progressRange,
  sumHistory,
  type Period,
} from '@/utils/progress';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const BLUR_START = 22;

// Same staggered entrance as Today's tasks lists (src/app/(tabs)/index.tsx) — 100ms apart, applied
// to every card below the header (title/date-nav/recap icon are left alone). playToken changes on
// every screen focus (including the first), so it replays each time the user comes back to this tab.
const ENTER_DELAY = { switcher: 50, hero: 150, stats: 250, chart: 350, streak: 450, categories: 550 };

function useEntrance(delayMs: number, playToken: number) {
  const v = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playToken) return;
    v.setValue(0);
    blur.setValue(0);
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(v, { toValue: 1, duration: 320, easing: EASE, useNativeDriver: true }),
        Animated.timing(blur, { toValue: 1, duration: 320, easing: EASE, useNativeDriver: false }),
      ]).start();
    }, delayMs);
    return () => clearTimeout(t);
  }, [v, blur, delayMs, playToken]);
  return {
    style: { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }) }] },
    blurIntensity: blur.interpolate({ inputRange: [0, 1], outputRange: [BLUR_START, 0] }),
  };
}

type Entrance = ReturnType<typeof useEntrance>;

function EntranceBox({ entrance, blurTint, children }: { entrance: Entrance; blurTint: 'light' | 'dark'; children: ReactNode }) {
  return (
    <Animated.View style={entrance.style}>
      {children}
      <AnimatedBlurView pointerEvents="none" tint={blurTint} intensity={entrance.blurIntensity} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const blurTint = useEffectiveScheme() === 'dark' ? 'dark' : 'light';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const firstUsedAt = usePlannerStore((s) => s.firstUsedAt);
  const authUser = useAuthStore((s) => s.user);
  const subscriptionState = usePlannerStore((s) => s.mockSubscriptionState);

  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const todayISO = useMemo(() => toISO(new Date()), []);

  const [enterToken, setEnterToken] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterToken(Date.now());
    }, [])
  );

  const switcherEnter = useEntrance(ENTER_DELAY.switcher, enterToken);
  const heroEnter = useEntrance(ENTER_DELAY.hero, enterToken);
  const statsEnter = useEntrance(ENTER_DELAY.stats, enterToken);
  const chartEnter = useEntrance(ENTER_DELAY.chart, enterToken);
  const streakEnter = useEntrance(ENTER_DELAY.streak, enterToken);
  const categoriesEnter = useEntrance(ENTER_DELAY.categories, enterToken);

  // Guest mode is bounded by when this device first opened the app; a signed-in account is
  // bounded by when that account was created, so browsing history never goes further back than
  // there's actually any data to have created.
  const boundISO = authUser?.created_at ? toISO(new Date(authUser.created_at)) : (firstUsedAt ?? todayISO);

  function changePeriod(next: Period) {
    setPeriod(next);
    setOffset(0);
  }

  const range = progressRange(period, todayISO, offset);
  const dates = datesInRange(range.start, range.end);
  const cur = sumHistory(dates, todayISO, plans);
  const prevDates = datesInRange(range.prevStart, range.prevEnd);
  const prev = sumHistory(prevDates, todayISO, plans);
  const delta = pctDelta(cur.completed, prev.completed);

  const completionRate = cur.total > 0 ? Math.round((cur.completed / cur.total) * 100) : 0;
  const streak = currentStreak(todayISO, plans);
  const longest = useMemo(() => longestStreak(plans), [plans]);
  const best = bestWeekday(dates, todayISO, plans);
  const colors = colorBreakdown(dates, plans);

  const canGoPrev = range.start > boundISO;
  const locked = isPeriodLocked(period, subscriptionState);

  return (
    <View style={[styles.screen, { backgroundColor: theme.surface }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 130 }}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h1, { color: theme.text }]}>{t('tab.progress')}</Text>
            <View style={styles.periodNav}>
              <Pressable onPress={() => setOffset((o) => o + 1)} disabled={!canGoPrev} hitSlop={8} style={{ opacity: canGoPrev ? 1 : 0.3 }}>
                <ChevronLeftIcon size={13} color={theme.textSecondary} strokeWidth={2.6} />
              </Pressable>
              <Text style={[styles.periodLabel, { color: theme.textSecondary }]}>{formatPeriodLabel(period, range)}</Text>
              <Pressable onPress={() => setOffset((o) => o - 1)} hitSlop={8}>
                <ChevronRightIcon size={13} color={theme.textSecondary} strokeWidth={2.6} />
              </Pressable>
            </View>
          </View>
          <View style={styles.headerActions}>
            {offset !== 0 && (
              <Pressable onPress={() => setOffset(0)} hitSlop={8}>
                <Text style={[styles.todayBtn, { color: theme.accent }]}>{t('home.today')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() =>
                locked ? router.push('/paywall') : router.push({ pathname: '/recap', params: { period, offset: String(offset) } })
              }
              style={[styles.recapBtn, { backgroundColor: theme.divider }]}>
              <SparkleIcon size={17} color={theme.text} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>

        <EntranceBox entrance={switcherEnter} blurTint={blurTint}>
          <SegmentedControl
            value={period}
            onChange={changePeriod}
            options={[
              { label: t('period.week'), value: 'week' },
              { label: t('period.month'), value: 'month' },
              { label: t('period.year'), value: 'year' },
            ]}
            style={styles.periodSwitch}
          />
        </EntranceBox>

        <View>
        <View pointerEvents={locked ? 'none' : 'auto'}>
        <EntranceBox entrance={heroEnter} blurTint={blurTint}>
          <ProgressHero
            eyebrow={heroEyebrow(period, range, offset)}
            completed={cur.completed}
            total={cur.total}
            completionRate={completionRate}
            deltaPct={delta}
            compareLabel={previousPeriodLabel(period, range)}
          />
        </EntranceBox>

        <EntranceBox entrance={statsEnter} blurTint={blurTint}>
          <ProgressStats completed={cur.completed} completionRate={completionRate} streak={streak} bestDay={weekdayShort(best)} />
        </EntranceBox>

        <EntranceBox entrance={chartEnter} blurTint={blurTint}>
          <ProgressChart period={period} startISO={range.start} endISO={range.end} todayISO={todayISO} plans={plans} />
        </EntranceBox>

        <EntranceBox entrance={streakEnter} blurTint={blurTint}>
          <ProgressStreakCard streak={streak} longest={longest} />
        </EntranceBox>

        <EntranceBox entrance={categoriesEnter} blurTint={blurTint}>
          <ProgressCategories rows={colors} />
        </EntranceBox>
        </View>

        {locked && (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={28} tint={blurTint} style={StyleSheet.absoluteFill} />
            <Reanimated.View
              key={period}
              entering={FadeInDown.springify().damping(14).stiffness(170)}
              style={[styles.lockCard, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
              <View style={[styles.lockIcon, { backgroundColor: theme.accentSoft }]}>
                <LockIcon size={22} color={theme.accent} />
              </View>
              <Text style={[styles.lockTitle, { color: theme.text }]}>
                {period === 'month' ? t('progress.locked.month') : t('progress.locked.year')}
              </Text>
              <Text style={[styles.lockBody, { color: theme.textSecondary }]}>
                {period === 'month' ? t('progress.locked.bodyMonth') : t('progress.locked.bodyYear')}
              </Text>
              <BouncyPressable pressedScale={0.94} onPress={() => router.push('/paywall')} style={[styles.unlockBtn, { backgroundColor: theme.accent }]}>
                <Text style={styles.unlockText}>{t('progress.unlock')}</Text>
              </BouncyPressable>
            </Reanimated.View>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  h1: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  periodNav: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  periodLabel: { fontSize: Typography.body, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayBtn: { fontSize: Typography.rowValue, fontWeight: '700' },
  recapBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  periodSwitch: { marginHorizontal: 20, marginTop: 12, marginBottom: 0 },
  lockCard: {
    marginHorizontal: 20,
    marginTop: 40,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#10203A',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  lockIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  lockTitle: { fontSize: Typography.heading, fontWeight: '700', textAlign: 'center' },
  lockBody: { fontSize: Typography.body, fontWeight: '500', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  unlockBtn: { marginTop: 16, height: 44, paddingHorizontal: 36, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unlockText: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
});
