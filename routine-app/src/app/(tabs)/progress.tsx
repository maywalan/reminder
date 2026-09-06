import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon, SparkleIcon } from '@/components/icon';
import { ProgressCategories } from '@/components/progress/progress-categories';
import { ProgressChart } from '@/components/progress/progress-chart';
import { ProgressHero } from '@/components/progress/progress-hero';
import { ProgressStats } from '@/components/progress/progress-stats';
import { ProgressStreakCard } from '@/components/progress/progress-streak-card';
import { SegmentedControl } from '@/components/segmented-control';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';
import { toISO } from '@/utils/dates';
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
  WEEKDAY_FULL,
  type Period,
} from '@/utils/progress';

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const firstUsedAt = usePlannerStore((s) => s.firstUsedAt);
  const authUser = useAuthStore((s) => s.user);

  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const todayISO = useMemo(() => toISO(new Date()), []);

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

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 130 }}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h1, { color: theme.text }]}>Progress</Text>
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
                <Text style={[styles.todayBtn, { color: theme.accent }]}>Today</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push({ pathname: '/recap', params: { period, offset: String(offset) } })}
              style={[styles.recapBtn, { backgroundColor: theme.divider }]}>
              <SparkleIcon size={17} color={theme.text} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>

        <SegmentedControl
          value={period}
          onChange={changePeriod}
          options={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
          style={styles.periodSwitch}
        />

        <ProgressHero
          eyebrow={heroEyebrow(period, range, offset)}
          completed={cur.completed}
          total={cur.total}
          completionRate={completionRate}
          deltaPct={delta}
          compareLabel={previousPeriodLabel(period, range)}
        />

        <ProgressStats completed={cur.completed} completionRate={completionRate} streak={streak} bestDay={WEEKDAY_FULL[best]} />

        <ProgressChart period={period} startISO={range.start} endISO={range.end} todayISO={todayISO} plans={plans} />

        <ProgressStreakCard streak={streak} longest={longest} />

        <ProgressCategories rows={colors} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  h1: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  periodNav: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  periodLabel: { fontSize: Typography.body, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayBtn: { fontSize: Typography.rowValue, fontWeight: '700' },
  recapBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  periodSwitch: { marginHorizontal: 20, marginTop: 12, marginBottom: 0 },
});
