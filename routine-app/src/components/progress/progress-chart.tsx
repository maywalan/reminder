import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { fromISO } from '@/utils/dates';
import {
  bestWeekday,
  datesInRange,
  heatmapCells,
  historyForDate,
  MONTH_LONG,
  MONTH_SHORT,
  WEEKDAY_FULL,
  yearMonthCells,
  type Period,
} from '@/utils/progress';

interface Props {
  period: Period;
  startISO: string;
  endISO: string;
  todayISO: string;
  plans: Plan[];
}

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 15a's chart card: a 7-bar week chart, a calendar-aligned month heatmap, or a 12-bar year chart, sharing one white card shell with a header row and a "Best day/month" footer. */
export function ProgressChart({ period, startISO, endISO, todayISO, plans }: Props) {
  const theme = useTheme();
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  const today = fromISO(todayISO);
  const dates = datesInRange(startISO, endISO);

  if (period === 'year') {
    const year = start.getFullYear();
    const cells = yearMonthCells(year, todayISO, plans);
    const max = Math.max(1, ...cells.map((c) => (c.isFuture ? 0 : c.completed)));
    const currentMonthIndex = year === today.getFullYear() ? today.getMonth() : -1;
    let bestIdx = -1;
    let bestCount = -1;
    cells.forEach((c, i) => {
      if (!c.isFuture && c.completed > bestCount) {
        bestCount = c.completed;
        bestIdx = i;
      }
    });

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Monthly completion</Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>JAN–DEC</Text>
        </View>
        <View style={styles.bars}>
          {cells.map((c, i) => {
            const isCurrent = i === currentMonthIndex;
            const h = c.isFuture ? 8 : 8 + (c.completed / max) * 80;
            return (
              <View key={c.label} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    styles.barYear,
                    { height: h, backgroundColor: c.isFuture ? theme.dividerStrong : isCurrent ? theme.accent : '#D9E7FA' },
                  ]}
                />
                <Text
                  style={[
                    styles.barLabelYear,
                    { color: c.isFuture ? theme.textFaint : isCurrent ? theme.accentStrong : theme.textTertiary, fontWeight: isCurrent ? '700' : '600' },
                  ]}>
                  {MONTH_SHORT[i][0]}
                </Text>
              </View>
            );
          })}
        </View>
        {bestIdx >= 0 && bestCount > 0 && (
          <View style={[styles.footer, { borderTopColor: theme.divider }]}>
            <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Best month</Text>
            <Text style={[styles.footerValue, { color: theme.text }]}>
              {MONTH_LONG[bestIdx]} · {bestCount} done
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (period === 'week') {
    const counts = dates.map((iso) => historyForDate(iso, todayISO, plans).completed);
    const max = Math.max(1, ...counts);
    const bestIdx = bestWeekday(dates, todayISO, plans);

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Daily completion</Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>
            {WEEKDAY_SHORT[start.getDay()]}–{WEEKDAY_SHORT[end.getDay()]}
          </Text>
        </View>
        <View style={styles.bars}>
          {dates.map((iso, i) => {
            const d = fromISO(iso);
            const isToday = iso === todayISO;
            const h = 4 + (counts[i] / max) * 92;
            return (
              <View key={iso} style={styles.barCol}>
                <View style={[styles.bar, { height: h, backgroundColor: isToday ? theme.accent : '#D9E7FA' }]} />
                <Text style={[styles.barLabelWeek, { color: isToday ? theme.accentStrong : theme.textTertiary, fontWeight: isToday ? '700' : '600' }]}>
                  {WEEKDAY_LETTER[d.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={[styles.footer, { borderTopColor: theme.divider }]}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Best day</Text>
          <Text style={[styles.footerValue, { color: theme.text }]}>{WEEKDAY_FULL[bestIdx]}</Text>
        </View>
      </View>
    );
  }

  const { startOffset, cells } = heatmapCells(startISO, endISO, todayISO, plans);
  const max = Math.max(1, ...cells.map((c) => c.completed));
  const bestIdx = bestWeekday(dates, todayISO, plans);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Daily completion</Text>
        <Text style={[styles.caption, { color: theme.textTertiary }]}>
          {MONTH_SHORT[start.getMonth()].toUpperCase()} {start.getDate()}–{end.getDate()}
        </Text>
      </View>
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
      <View style={[styles.footer, { borderTopColor: theme.divider }]}>
        <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Best day</Text>
        <Text style={[styles.footerValue, { color: theme.text }]}>{WEEKDAY_FULL[bestIdx]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.subcard, borderWidth: 1, marginHorizontal: 14, marginTop: 14, padding: 13 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: Typography.rowLabel, fontWeight: '700' },
  caption: { fontSize: 10, fontWeight: '500' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 14 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 8 },
  barYear: { borderRadius: 5 },
  barLabelWeek: { fontSize: 9.5 },
  barLabelYear: { fontSize: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 11, borderTopWidth: 1 },
  footerLabel: { fontSize: 11, fontWeight: '500' },
  footerValue: { fontSize: 11.5, fontWeight: '700' },
  heatDow: { flexDirection: 'row', marginTop: 12, marginBottom: 6 },
  heatDowText: { flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: '700' },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  heatCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 },
  heatCell: { flex: 1, borderRadius: 8 },
});
