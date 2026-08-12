import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { toISO } from '@/utils/dates';
import { bestWeekday, currentStreak, datesInRange, progressRange, sumHistory, type Period } from '@/utils/progress';

const PERIOD_LABEL: Record<Period, string> = { week: 'This Week', month: 'This Month', year: 'This Year' };
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RecapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { period: periodParam } = useLocalSearchParams<{ period?: string }>();
  const period = (periodParam as Period) ?? 'week';

  const plans = usePlannerStore((s) => s.plans);
  const todayISO = useMemo(() => toISO(new Date()), []);

  const range = progressRange(period, todayISO);
  const dates = datesInRange(range.start, range.end);
  const cur = sumHistory(dates, todayISO, plans);
  const streak = currentStreak(todayISO, plans);
  const best = bestWeekday(dates, todayISO, plans);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Close</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>Your Recap</Text>
        <View style={{ width: 44 }} />
      </View>

      <LinearGradient
        colors={['#5B5FEF', '#8B5CF6', '#FF6482']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.card}>
        <Text style={styles.eyebrow}>{PERIOD_LABEL[period]}</Text>
        <Text style={styles.big}>{cur.completed}</Text>
        <Text style={styles.bigLabel}>tasks completed</Text>

        <View style={styles.insight}>
          <Text style={styles.insightText}>
            {streak > 0 ? `You're on a ${streak}-day streak — keep it going!` : 'Complete a task today to start a streak!'}
          </Text>
        </View>
        <View style={styles.insight}>
          <Text style={styles.insightText}>Your most productive day is {WEEKDAY_FULL[best]}.</Text>
        </View>
      </LinearGradient>

      <Pressable
        onPress={() => Alert.alert('Recap shared!')}
        style={[styles.shareBtn, { backgroundColor: theme.text }]}>
        <Text style={{ color: theme.surface, fontSize: 15, fontWeight: '700' }}>Share Recap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 8 },
  card: {
    borderRadius: 28,
    padding: 24,
    marginTop: 16,
  },
  eyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  big: { color: '#fff', fontSize: 56, fontWeight: '800', letterSpacing: -0.5 },
  bigLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  insight: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, marginTop: 10 },
  insightText: { color: '#fff', fontSize: 13.5, lineHeight: 19 },
  shareBtn: { marginTop: 18, padding: 14, borderRadius: Radii.md, alignItems: 'center' },
});
