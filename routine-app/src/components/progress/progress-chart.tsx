import { StyleSheet, Text, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { fromISO } from '@/utils/dates';
import { heatmapCells, yearMonthCells, type Period } from '@/utils/progress';

interface Props {
  period: Period;
  startISO: string;
  endISO: string;
  todayISO: string;
  plans: Plan[];
}

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ProgressChart({ period, startISO, endISO, todayISO, plans }: Props) {
  const theme = useTheme();

  if (period === 'year') {
    const year = fromISO(startISO).getFullYear();
    const cells = yearMonthCells(year, todayISO, plans);
    const max = Math.max(1, ...cells.map((c) => c.completed));
    return (
      <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
        <View style={styles.monthGrid}>
          {cells.map((c) => {
            const opacity = c.completed === 0 ? 0.12 : 0.25 + (c.completed / max) * 0.75;
            return (
              <View key={c.label} style={styles.monthCellWrap}>
                {c.isFuture ? (
                  <View style={[styles.monthCell, styles.monthCellFuture, { borderColor: theme.divider }]}>
                    <Text style={[styles.monthCellLabel, { color: theme.textTertiary }]}>{c.label}</Text>
                  </View>
                ) : (
                  <View style={[styles.monthCell, { backgroundColor: theme.accent, opacity }]}>
                    <Text style={[styles.monthCellLabel, { color: '#fff' }]}>{c.label}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const { startOffset, cells } = heatmapCells(startISO, endISO, todayISO, plans);
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

const styles = StyleSheet.create({
  surface: { borderRadius: Radii.lg, borderWidth: 1, marginHorizontal: 14, marginTop: 8 },
  heatDow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, marginBottom: 4 },
  heatDowText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 14 },
  heatCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 },
  heatCell: { flex: 1, borderRadius: 6 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  monthCellWrap: { width: '25%', aspectRatio: 1, padding: 4 },
  monthCell: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthCellFuture: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed' },
  monthCellLabel: { fontSize: 12, fontWeight: '700' },
});
