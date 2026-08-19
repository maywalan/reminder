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

export function ProgressStats({ completed, completionRate, streak, bestDay }: Props) {
  const theme = useTheme();

  const tiles = [
    { icon: CheckIcon, value: String(completed), label: 'Completed' },
    { icon: ChartIcon, value: `${completionRate}%`, label: 'Completion Rate' },
    { icon: SparkleIcon, value: String(streak), label: 'Current Streak' },
    { icon: CalendarIcon, value: bestDay, label: 'Best Day', small: true },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((t, i) => (
        <View key={i} style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
            <t.icon size={16} color={theme.accentStrong} strokeWidth={2} />
          </View>
          <Text style={[styles.value, { color: theme.text, fontSize: t.small ? 16 : 22 }]}>{t.value}</Text>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 22, marginTop: 14 },
  tile: { width: '47%', borderRadius: Radii.md, borderWidth: 1, padding: 14 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontWeight: '800', marginBottom: 2, letterSpacing: -0.2 },
  label: { fontSize: Typography.label, fontWeight: '600' },
});
