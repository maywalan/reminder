import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { buildMonthGrid, MONTHS, WEEKDAY_LETTER } from '@/utils/calendar';

interface Props {
  year: number;
  todayISO: string;
  plans: Plan[];
  onShiftYear: (delta: number) => void;
  onPressMonth: (month: number) => void;
}

export function YearView({ year, todayISO, plans, onShiftYear, onPressMonth }: Props) {
  const theme = useTheme();
  const planDates = new Set(plans.map((p) => p.date));

  return (
    <View>
      <View style={styles.nav}>
        <Text style={[styles.navLabel, { color: theme.text }]}>{year}</Text>
        <View style={styles.arrows}>
          <Pressable onPress={() => onShiftYear(-1)} style={[styles.arrowBtn, { borderColor: theme.divider }]}>
            <ChevronLeftIcon size={14} color={theme.text} strokeWidth={2.3} />
          </Pressable>
          <Pressable onPress={() => onShiftYear(1)} style={[styles.arrowBtn, { borderColor: theme.divider }]}>
            <ChevronRightIcon size={14} color={theme.text} strokeWidth={2.3} />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {MONTHS.map((name, m) => {
          const cells = buildMonthGrid(year, m);
          return (
            <Pressable
              key={m}
              onPress={() => onPressMonth(m)}
              style={[styles.mini, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
              <Text style={[styles.miniTitle, { color: theme.text }]}>{name}</Text>
              <View style={styles.miniDow}>
                {WEEKDAY_LETTER.map((l, i) => (
                  <Text key={i} style={[styles.miniDowText, { color: theme.textTertiary }]}>
                    {l}
                  </Text>
                ))}
              </View>
              <View style={styles.miniDays}>
                {cells.map((cell, i) => {
                  const isToday = cell.date === todayISO;
                  const hasPlan = !!cell.date && planDates.has(cell.date);
                  return (
                    <View key={i} style={styles.miniDayCell}>
                      {!cell.muted && (
                        <View style={[styles.miniDayNum, isToday && { backgroundColor: theme.accent, borderRadius: 6 }]}>
                          <Text style={[styles.miniDayText, { color: isToday ? '#fff' : theme.textSecondary }]}>{cell.day}</Text>
                        </View>
                      )}
                      {hasPlan && !isToday && <View style={[styles.miniDot, { backgroundColor: theme.accent }]} />}
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 10 },
  navLabel: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 12 },
  mini: { width: '46%', borderRadius: 14, borderWidth: 1, padding: 10 },
  miniTitle: { fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
  miniDow: { flexDirection: 'row', marginBottom: 2 },
  miniDowText: { flex: 1, textAlign: 'center', fontSize: 7, fontWeight: '700' },
  miniDays: { flexDirection: 'row', flexWrap: 'wrap' },
  miniDayCell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 1.5, minHeight: 12 },
  miniDayNum: { minWidth: 12, alignItems: 'center', justifyContent: 'center' },
  miniDayText: { fontSize: 8.5 },
  miniDot: { position: 'absolute', bottom: 0, width: 3, height: 3, borderRadius: 1.5 },
});
