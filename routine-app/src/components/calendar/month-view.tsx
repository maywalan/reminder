import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarDensity, Plan } from '@/store/types';
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
  density: CalendarDensity;
  holidayByDate: Record<string, string>;
}

const DETAILED_CHIP_LIMIT = 2;

export function MonthView({ year, month, todayISO, selectedDate, plans, colorForPlan, onSelectDate, onShiftMonth, density, holidayByDate }: Props) {
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
              <View key={i} style={[styles.cell, density === 'detailed' && styles.cellDetailed]}>
                <Text style={[styles.dayNum, { color: theme.textTertiary }]}>{cell.day}</Text>
              </View>
            );
          }
          const isToday = cell.date === todayISO;
          const isSelected = cell.date === selectedDate;
          const dayPlans = plans.filter((p) => p.date === cell.date);
          const pendingCount = dayPlans.filter((p) => !p.completed).length;
          const holidayName = holidayByDate[cell.date];

          return (
            <Pressable
              key={i}
              onPress={() => onSelectDate(cell.date!)}
              style={[styles.cell, density === 'detailed' && styles.cellDetailed]}>
              <View style={styles.dayNumRow}>
                <View
                  style={[
                    styles.dayNumWrap,
                    isSelected && { backgroundColor: theme.accent },
                    isToday && !isSelected && { borderWidth: 1.6, borderColor: theme.accent },
                  ]}>
                  <Text style={[styles.dayNum, { color: isSelected ? '#fff' : isToday ? theme.accent : theme.text }]}>{cell.day}</Text>
                </View>
                {holidayName && <View style={styles.holidayDot} />}
                {density === 'detailed' && pendingCount > 0 && (
                  <View style={[styles.pendingBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>

              {density === 'detailed' && holidayName && (
                <View style={[styles.chip, styles.holidayChip]}>
                  <Text numberOfLines={1} style={[styles.chipText, styles.holidayChipText]}>
                    🎉 {holidayName}
                  </Text>
                </View>
              )}

              {density === 'compact' ? (
                <View style={styles.dots}>
                  {dayPlans.slice(0, 3).map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.dot,
                        p.completed
                          ? { borderWidth: 1, borderColor: colorForPlan(p), backgroundColor: 'transparent' }
                          : { backgroundColor: colorForPlan(p) },
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.chips}>
                  {dayPlans.slice(0, DETAILED_CHIP_LIMIT).map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.chip,
                        { backgroundColor: p.completed ? theme.dividerStrong : colorForPlan(p) + '2A' },
                      ]}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.chipText,
                          { color: p.completed ? theme.textTertiary : colorForPlan(p) },
                          p.completed && styles.chipTextDone,
                        ]}>
                        {p.name}
                      </Text>
                    </View>
                  ))}
                  {dayPlans.length > DETAILED_CHIP_LIMIT && (
                    <Text style={[styles.more, { color: theme.textTertiary }]}>+{dayPlans.length - DETAILED_CHIP_LIMIT} more</Text>
                  )}
                </View>
              )}
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
  navLabel: { fontSize: Typography.title, fontWeight: '800', letterSpacing: -0.2 },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dowRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: Typography.label, fontWeight: '700', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  cellDetailed: { aspectRatio: undefined, minHeight: 74, alignItems: 'stretch', justifyContent: 'flex-start', paddingHorizontal: 3, paddingTop: 4, gap: 2 },
  dayNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dayNumWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: Typography.body, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  pendingBadge: { position: 'absolute', right: 2, top: -1, minWidth: 13, height: 13, borderRadius: 6.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  pendingBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '800' },
  holidayDot: { position: 'absolute', left: 2, top: -1, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFB020' },
  holidayChip: { backgroundColor: 'rgba(255,176,32,0.16)' },
  holidayChipText: { color: '#B8790C' },
  chips: { gap: 2, marginTop: 2 },
  chip: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1.5 },
  chipText: { fontSize: 9, fontWeight: '700' },
  chipTextDone: { textDecorationLine: 'line-through' },
  more: { fontSize: 8.5, fontWeight: '700', marginLeft: 2 },
});
