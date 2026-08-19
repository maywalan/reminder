import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SparkleIcon } from '@/components/icon';
import { ProgressCategories } from '@/components/progress/progress-categories';
import { ProgressChart } from '@/components/progress/progress-chart';
import { ProgressHero } from '@/components/progress/progress-hero';
import { ProgressStats } from '@/components/progress/progress-stats';
import { SegmentedControl } from '@/components/segmented-control';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { toISO } from '@/utils/dates';
import { bestWeekday, categoryBreakdown, currentStreak, datesInRange, pctDelta, progressRange, sumHistory, type Period } from '@/utils/progress';

const PERIOD_LABEL: Record<Period, string> = { week: 'This Week', month: 'This Month', year: 'This Year' };
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);

  const [period, setPeriod] = useState<Period>('week');
  const todayISO = useMemo(() => toISO(new Date()), []);

  const range = progressRange(period, todayISO);
  const dates = datesInRange(range.start, range.end);
  const cur = sumHistory(dates, todayISO, plans);
  const prevDates = datesInRange(range.prevStart, range.prevEnd);
  const prev = sumHistory(prevDates, todayISO, plans);
  const delta = pctDelta(cur.completed, prev.completed);

  const completionRate = cur.total > 0 ? Math.round((cur.completed / cur.total) * 100) : 0;
  const streak = currentStreak(todayISO, plans);
  const best = bestWeekday(dates, todayISO, plans);
  const categories = categoryBreakdown(cur.completed, `${period}-${range.start}`, groups);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: theme.text }]}>Progress</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/recap', params: { period } })}
            style={[styles.recapBtn, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
            <SparkleIcon size={18} color={theme.text} strokeWidth={1.6} />
          </Pressable>
        </View>

        <SegmentedControl
          value={period}
          onChange={setPeriod}
          options={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
        />

        <ProgressHero periodLabel={PERIOD_LABEL[period]} completed={cur.completed} deltaPct={delta} />
        <ProgressStats completed={cur.completed} completionRate={completionRate} streak={streak} bestDay={WEEKDAY_FULL[best]} />

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>TREND</Text>
        <ProgressChart period={period} todayISO={todayISO} weekDates={dates} plans={plans} />

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>BY CATEGORY</Text>
        <ProgressCategories rows={categories} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 2 },
  h1: { fontSize: Typography.display, fontWeight: '800', letterSpacing: -0.4 },
  recapBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 22, marginTop: 20, marginBottom: 8 },
});
