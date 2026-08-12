import { StyleSheet, Text, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { monthHeatmapCells, weekBars, yearBars, type Period } from '@/utils/progress';

interface Props {
  period: Period;
  todayISO: string;
  weekDates: string[];
  plans: Plan[];
}

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ProgressChart({ period, todayISO, weekDates, plans }: Props) {
  const theme = useTheme();

  if (period === 'month') {
    const { startOffset, cells } = monthHeatmapCells(todayISO, plans);
    const max = Math.max(1, ...cells.map((c) => c.completed));
    return (
      <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
        <View style={styles.heatDow}>
          {WEEKDAY_LETTER.map((l, i) => (
            <Text key={i} style={[styles.heatDowText, { color: theme.textTertiary }]}>
              {l}
            </Text>
          ))}
        </View>
        <View style={styles.heatGrid}>
          {Array.from({ length: startOffset }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.heatCellWrap} />
          ))}
          {cells.map((c) => {
            const opacity = c.isFuture ? 0 : c.completed === 0 ? 0.12 : 0.25 + (c.completed / max) * 0.75;
            const isToday = c.iso === todayISO;
            return (
              <View key={c.iso} style={styles.heatCellWrap}>
                <View
                  style={[styles.heatCell, { backgroundColor: theme.accent, opacity }, isToday && { borderWidth: 1.6, borderColor: theme.accent }]}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const bars = period === 'week' ? weekBars(weekDates, todayISO, plans) : yearBars(todayISO, plans);
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
      <View style={styles.barRow}>
        {bars.map((b, i) => (
          <View key={i} style={styles.barCol}>
            <Text style={[styles.barValue, { color: theme.textSecondary }]}>{b.future ? '' : b.value}</Text>
            <View
              style={[
                styles.bar,
                { height: Math.max(4, Math.round((b.value / max) * 64)), backgroundColor: b.future ? theme.divider : theme.accent },
              ]}
            />
            <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{b.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: Radii.lg, borderWidth: 1, marginHorizontal: 14, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 12, paddingVertical: 14 },
  barCol: { flex: 1, height: 112, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 },
  bar: { width: '100%', maxWidth: 26, borderRadius: 6 },
  barLabel: { fontSize: 10, fontWeight: '700' },
  barValue: { fontSize: 10, fontWeight: '700', minHeight: 12 },
  heatDow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, marginBottom: 4 },
  heatDowText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 14 },
  heatCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 },
  heatCell: { flex: 1, borderRadius: 6 },
});
