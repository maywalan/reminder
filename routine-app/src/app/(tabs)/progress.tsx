import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, ChevronRightIcon, SparkleIcon } from '@/components/icon';
import { ProgressCategories } from '@/components/progress/progress-categories';
import { ProgressChart } from '@/components/progress/progress-chart';
import { ProgressHero } from '@/components/progress/progress-hero';
import { ProgressStats } from '@/components/progress/progress-stats';
import { SegmentedControl } from '@/components/segmented-control';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';
import { toISO } from '@/utils/dates';
import { bestWeekday, colorBreakdown, currentStreak, datesInRange, formatPeriodLabel, pctDelta, progressRange, sumHistory, type Period } from '@/utils/progress';

const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const best = bestWeekday(dates, todayISO, plans);
  const colors = colorBreakdown(dates, plans);

  const canGoNext = offset > 0;
  const canGoPrev = range.start > boundISO;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: theme.text }]}>Progress</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/recap', params: { period, offset: String(offset) } })}
            style={[styles.recapBtn, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
            <SparkleIcon size={18} color={theme.text} strokeWidth={1.6} />
          </Pressable>
        </View>

        <SegmentedControl
          value={period}
          onChange={changePeriod}
          options={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
        />

        <View style={styles.navRow}>
          <Pressable
            onPress={() => setOffset((o) => o + 1)}
            disabled={!canGoPrev}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: theme.surface, borderColor: theme.divider, opacity: canGoPrev ? 1 : 0.3 }]}>
            <ChevronLeftIcon size={17} color={theme.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={[styles.navLabel, { color: theme.text }]}>{formatPeriodLabel(period, range)}</Text>
          <Pressable
            onPress={() => setOffset((o) => Math.max(0, o - 1))}
            disabled={!canGoNext}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: theme.surface, borderColor: theme.divider, opacity: canGoNext ? 1 : 0.3 }]}>
            <ChevronRightIcon size={17} color={theme.text} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ProgressHero periodLabel={formatPeriodLabel(period, range)} completed={cur.completed} deltaPct={delta} />
        <ProgressStats completed={cur.completed} completionRate={completionRate} streak={streak} bestDay={WEEKDAY_FULL[best]} />

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>TREND</Text>
        <ProgressChart period={period} startISO={range.start} endISO={range.end} todayISO={todayISO} plans={plans} />

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>BY COLOR</Text>
        <ProgressCategories rows={colors} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 2 },
  h1: { fontSize: Typography.display, fontWeight: '800', letterSpacing: -0.4 },
  recapBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 16, marginBottom: 18 },
  navBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: Typography.heading, fontWeight: '700', textAlign: 'center' },
  sectionLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 22, marginTop: 20, marginBottom: 8 },
});
