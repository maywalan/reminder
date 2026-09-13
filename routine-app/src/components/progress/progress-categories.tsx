import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ColorRow } from '@/utils/progress';

export function ProgressCategories({ rows }: { rows: ColorRow[] }) {
  const theme = useTheme();
  const hasData = rows.some((r) => r.count > 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <Text style={[styles.title, { color: theme.text }]}>By color</Text>
      {!hasData ? (
        <Text style={[styles.empty, { color: theme.textTertiary }]}>No data yet</Text>
      ) : (
        <View style={styles.rows}>
          {rows.map((r) => (
            <View key={r.color} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <View style={[styles.track, { backgroundColor: theme.divider }]}>
                <View style={[styles.fill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
              </View>
              <Text style={[styles.pct, { color: theme.textSecondary }]}>{r.pct}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.subcard, borderWidth: 1, marginHorizontal: 14, marginTop: 14, padding: 13 },
  title: { fontSize: Typography.rowLabel, fontWeight: '700' },
  empty: { fontSize: Typography.body, textAlign: 'center', paddingVertical: 10 },
  rows: { gap: 11, marginTop: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  pct: { fontSize: 10.5, fontWeight: '500', width: 32, textAlign: 'right' },
});
