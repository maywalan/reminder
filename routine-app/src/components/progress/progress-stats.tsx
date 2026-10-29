import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { CalendarIcon, ClockIcon, SparkleIcon, XIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t as tr } from '@/i18n';

interface Props {
  missed: number;
  longest: number;
  bestDay: string;
  busiest: string;
}

/**
 * A quick-glance row under the hero card. It holds only what the hero and streak card don't
 * already say (critique, 2026-10-29: Completed, Rate and Streak repeated them).
 */
export function ProgressStats({ missed, longest, bestDay, busiest }: Props) {
  const theme = useTheme();

  const tiles = [
    { icon: XIcon, value: String(missed), label: tr('progress.stat.missed') },
    { icon: SparkleIcon, value: String(longest), label: tr('progress.stat.longest') },
    { icon: CalendarIcon, value: bestDay, label: tr('progress.stat.bestDay') },
    { icon: ClockIcon, value: busiest, label: tr('progress.stat.busiest') },
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
          <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={[styles.label, { color: theme.textSecondary }]}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 14 },
  tile: { flex: 1, borderRadius: Radii.md, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  iconWrap: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: Typography.rowLabel, fontWeight: '800', letterSpacing: -0.2 },
  label: { fontSize: Typography.label, fontWeight: '600', textAlign: 'center' },
});
