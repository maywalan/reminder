import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icon';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { buildMonthGrid, MONTHS, WEEKDAY_LETTER } from '@/utils/calendar';

interface Props {
  year: number;
  month: number;
  todayISO: string;
  selectedDate: string;
  plans: Plan[];
  colorForPlan: (p: Plan) => string;
  onSelectDate: (iso: string) => void;
  onShiftMonth: (delta: number) => void;
}

export function MonthView({ year, month, todayISO, selectedDate, plans, colorForPlan, onSelectDate, onShiftMonth }: Props) {
  const theme = useTheme();
  const cells = buildMonthGrid(year, month);

  return (
    <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
      <View style={styles.nav}>
        <Text style={[styles.navLabel, { color: theme.text }]}>
          {MONTHS[month]} {year}
        </Text>
        <View style={styles.arrows}>
          <Pressable onPress={() => onShiftMonth(-1)} style={[styles.arrowBtn, { borderColor: theme.divider }]}>
            <ChevronLeftIcon size={14} color={theme.text} strokeWidth={2.3} />
          </Pressable>
          <Pressable onPress={() => onShiftMonth(1)} style={[styles.arrowBtn, { borderColor: theme.divider }]}>
            <ChevronRightIcon size={14} color={theme.text} strokeWidth={2.3} />
          </Pressable>
        </View>
      </View>

      <View style={styles.dowRow}>
        {WEEKDAY_LETTER.map((l, i) => (
          <Text key={i} style={[styles.dow, { color: theme.textTertiary }]}>
            {l}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (cell.muted || !cell.date) {
            return (
              <View key={i} style={styles.cell}>
                <Text style={[styles.dayNum, { color: theme.textTertiary }]}>{cell.day}</Text>
              </View>
            );
          }
          const isToday = cell.date === todayISO;
          const isSelected = cell.date === selectedDate;
          const dayPlans = plans.filter((p) => p.date === cell.date).slice(0, 3);

          return (
            <Pressable key={i} onPress={() => onSelectDate(cell.date!)} style={styles.cell}>
              <View
                style={[
                  styles.dayNumWrap,
                  isSelected && { backgroundColor: theme.accent },
                  isToday && !isSelected && { borderWidth: 1.6, borderColor: theme.accent },
                ]}>
                <Text style={[styles.dayNum, { color: isSelected ? '#fff' : isToday ? theme.accent : theme.text }]}>{cell.day}</Text>
              </View>
              <View style={styles.dots}>
                {dayPlans.map((p) => (
                  <View key={p.id} style={[styles.dot, { backgroundColor: colorForPlan(p) }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: Radii.lg, borderWidth: 1, marginHorizontal: 14, paddingBottom: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  navLabel: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dowRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNumWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13.5, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
