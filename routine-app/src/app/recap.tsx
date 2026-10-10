import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { t } from '@/i18n';
import { weekdayLong } from '@/i18n/format';
import { toISO } from '@/utils/dates';
import { isPeriodLocked } from '@/utils/premium';
import { bestWeekday, currentStreak, datesInRange, formatPeriodLabel, progressRange, sumHistory, type Period } from '@/utils/progress';


export default function RecapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { period: periodParam, offset: offsetParam } = useLocalSearchParams<{ period?: string; offset?: string }>();
  const period = (periodParam as Period) ?? 'week';
  const offset = Number(offsetParam ?? 0) || 0;

  const plans = usePlannerStore((s) => s.plans);
  const subscriptionState = usePlannerStore((s) => s.mockSubscriptionState);
  const todayISO = useMemo(() => toISO(new Date()), []);

  const range = progressRange(period, todayISO, offset);
  const dates = datesInRange(range.start, range.end);
  const cur = sumHistory(dates, todayISO, plans);
  const streak = currentStreak(todayISO, plans);
  const best = bestWeekday(dates, todayISO, plans);

  // Progress already routes a locked period to the paywall; this keeps any other way in honest.
  if (isPeriodLocked(period, subscriptionState)) {
    return <Redirect href="/paywall" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.heading, fontWeight: '600' }}>{t('common.close')}</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: Typography.title, fontWeight: '800' }}>{t('recap.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <LinearGradient
        colors={['#5B5FEF', '#8B5CF6', '#FF6482']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.card}>
        <Text style={styles.eyebrow}>{formatPeriodLabel(period, range)}</Text>
        <Text style={styles.big}>{cur.completed}</Text>
        <Text style={styles.bigLabel}>{t('recap.tasksCompleted')}</Text>

        <View style={styles.insight}>
          <Text style={styles.insightText}>
            {streak > 0 ? t('recap.streak', { count: streak }) : t('recap.noStreak')}
          </Text>
        </View>
        <View style={styles.insight}>
          <Text style={styles.insightText}>{t('recap.bestDay', { day: weekdayLong(best) })}</Text>
        </View>
      </LinearGradient>

      <Pressable
        onPress={() => Alert.alert(t('recap.shared'))}
        style={[styles.shareBtn, { backgroundColor: theme.text }]}>
        <Text style={{ color: theme.surface, fontSize: Typography.heading, fontWeight: '700' }}>{t('recap.share')}</Text>
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
  eyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.label, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  big: { color: '#fff', fontSize: 56, fontWeight: '800', letterSpacing: -0.5 },
  bigLabel: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.body, fontWeight: '600', marginBottom: 20 },
  insight: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, marginTop: 10 },
  insightText: { color: '#fff', fontSize: Typography.body, lineHeight: 19 },
  shareBtn: { marginTop: 18, padding: 14, borderRadius: Radii.md, alignItems: 'center' },
});
