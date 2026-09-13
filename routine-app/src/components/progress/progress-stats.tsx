import { StyleSheet, Text, View } from 'react-native';

import { CalendarIcon, CheckIcon, ChartIcon, SparkleIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  completed: number;
  completionRate: number;
  streak: number;
  bestDay: string;
}

/**
 * Not part of 15a's own mockup — the four stats the code already tracks (completion rate,
 * completed, streak, best day), which 15a instead wove into the ring/hero line/streak card/chart
 * footer. Kept here too as a quick-glance row so they're still scannable at once, styled to sit
 * cohesively under the hero card rather than as the old 2x2 tile grid.
 */
export function ProgressStats({ completed, completionRate, streak, bestDay }: Props) {
  const theme = useTheme();

  const tiles = [
    { icon: CheckIcon, value: String(completed), label: 'Completed' },
    { icon: ChartIcon, value: `${completionRate}%`, label: 'Rate' },
    { icon: SparkleIcon, value: String(streak), label: 'Streak' },
    { icon: CalendarIcon, value: bestDay.slice(0, 3), label: 'Best day' },
  ];

  return (
    <View style={styles.row}>
      {tiles.map((t, i) => (
        <View key={i} style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
            <t.icon size={12} color={theme.accentStrong} strokeWidth={2.2} />
          </View>
          <Text numberOfLines={1} style={[styles.value, { color: theme.text }]}>
            {t.value}
          </Text>
          <Text numberOfLines={1} style={[styles.label, { color: theme.textSecondary }]}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 14 },
  tile: { flex: 1, borderRadius: Radii.md, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 4 },
  iconWrap: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: Typography.rowLabel, fontWeight: '800', letterSpacing: -0.2 },
  label: { fontSize: 9, fontWeight: '600' },
});
