import { StyleSheet, Text, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CategoryRow } from '@/utils/progress';

export function ProgressCategories({ rows }: { rows: CategoryRow[] }) {
  const theme = useTheme();
  const hasData = rows.some((r) => r.count > 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
      {!hasData ? (
        <Text style={{ color: theme.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>No data yet</Text>
      ) : (
        rows.map((r) => (
          <View key={r.group.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: r.group.color }]} />
            <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
              {r.group.name}
            </Text>
            <View style={[styles.track, { backgroundColor: theme.divider }]}>
              <View style={[styles.fill, { width: `${r.pct}%`, backgroundColor: r.group.color }]} />
            </View>
            <Text style={[styles.pct, { color: theme.textSecondary }]}>{r.pct}%</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.md, borderWidth: 1, marginHorizontal: 22, marginTop: 8, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  name: { fontSize: 13, fontWeight: '600', width: 70 },
  track: { flex: 1, height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  pct: { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },
});
