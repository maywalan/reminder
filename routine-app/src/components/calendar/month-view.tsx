import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { t } from '@/i18n';
import { displayYear, monthLong, weekdayLetterList } from '@/i18n/format';
import { buildMonthGrid } from '@/utils/calendar';
import { fromISO } from '@/utils/dates';
import { isMissedToday } from '@/utils/home-feed';

interface Props {
  year: number;
  month: number;
  todayISO: string;
  selectedDate: string;
  plans: Plan[];
  colorForPlan: (p: Plan) => string;
  onSelectDate: (iso: string) => void;
  onShiftMonth: (delta: number) => void;
  onToday: () => void;
  holidayByDate: Record<string, string>;
}

/**
 * The grid is an overview (critique, 2026-10-29): up to three colour dots per day, with names in
 * the selected day's list below. Name chips were 9pt and cut to four or five letters.
 */
const DOT_LIMIT = 3;
/** iOS's 44pt minimum around the 30pt month arrows. */
const ARROW_SLOP = 7;

export function MonthView({ year, month, todayISO, selectedDate, plans, colorForPlan, onSelectDate, onShiftMonth, onToday, holidayByDate }: Props) {
  const theme = useTheme();
  const cells = buildMonthGrid(year, month);
  const today = fromISO(todayISO);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const nowMs = Date.now();

  return (
    <View style={[styles.surface, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={styles.nav}>
        <Text style={[styles.navLabel, { color: theme.text }]}>
          {monthLong(month)} {displayYear(year)}
        </Text>
        <View style={styles.navActions}>
          {!isCurrentMonth && (
            <Pressable onPress={onToday} hitSlop={8}>
              <Text style={[styles.todayBtn, { color: theme.accentStrong }]}>{t('home.today')}</Text>
            </Pressable>
          )}
          <View style={styles.arrows}>
            <Pressable onPress={() => onShiftMonth(-1)} hitSlop={ARROW_SLOP} accessibilityRole="button" accessibilityLabel={t('calendar.prevMonth')} style={[styles.arrowBtn, { borderColor: theme.cardBorder }]}>
              <ChevronLeftIcon size={14} color={theme.text} strokeWidth={2.3} />
            </Pressable>
            <Pressable onPress={() => onShiftMonth(1)} hitSlop={ARROW_SLOP} accessibilityRole="button" accessibilityLabel={t('calendar.nextMonth')} style={[styles.arrowBtn, { borderColor: theme.cardBorder }]}>
              <ChevronRightIcon size={14} color={theme.text} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.dowRow}>
        {weekdayLetterList().map((l, i) => (
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
                <View style={styles.dayNumRow}>
                  <View style={styles.dayNumWrap}>
                    <Text style={[styles.dayNum, { color: theme.textTertiary }]}>{cell.day}</Text>
                  </View>
                </View>
              </View>
            );
          }
          const isToday = cell.date === todayISO;
          const isSelected = cell.date === selectedDate;
          const dayPlans = plans.filter((p) => p.date === cell.date).sort((a, b) => a.time.localeCompare(b.time));
          // Counts are for work still ahead; a past day's unfinished plans are missed, marked in rose
          // like Home, so history doesn't shout "7 to do" (critique, 2026-10-29).
          const isPast = cell.date < todayISO;
          const ahead = isPast ? [] : dayPlans.filter((p) => !p.completed && !(isToday && isMissedToday(p, nowMs)));
          const hasMissed = dayPlans.some((p) => !p.completed && (isPast || (isToday && isMissedToday(p, nowMs))));
          const holidayName = holidayByDate[cell.date];

          return (
            <Pressable
              key={i}
              onPress={() => onSelectDate(cell.date!)}
              style={styles.cell}>
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
                {ahead.length > 0 ? (
                  <View style={[styles.pendingBadge, { backgroundColor: theme.accent }]}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.pendingBadgeText}>
                      {ahead.length}
                    </Text>
                  </View>
                ) : (
                  hasMissed && <View style={[styles.missedDot, { backgroundColor: theme.danger }]} />
                )}
              </View>

              <View style={styles.dots}>
                {dayPlans.slice(0, DOT_LIMIT).map((p) => (
                  <View key={p.id} style={[styles.dot, { backgroundColor: p.completed ? theme.dividerStrong : colorForPlan(p) }]} />
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
  surface: { borderRadius: Radii.panel, borderWidth: 1, marginHorizontal: 14, paddingBottom: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  navLabel: { fontSize: Typography.title, fontWeight: '800', letterSpacing: -0.2 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  todayBtn: { fontSize: Typography.body, fontWeight: '700' },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dowRow: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: Typography.label, fontWeight: '700', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6 },
  cell: { width: `${100 / 7}%`, minHeight: 50, alignItems: 'stretch', justifyContent: 'flex-start', paddingHorizontal: 3, paddingTop: 4, gap: 2 },
  dayNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dayNumWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: Typography.body, fontWeight: '600' },
  pendingBadge: { position: 'absolute', right: 0, top: -3, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  pendingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  missedDot: { position: 'absolute', right: 4, top: 0, width: 7, height: 7, borderRadius: 3.5 },
  holidayDot: { position: 'absolute', left: 2, top: -1, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFB020' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 3, height: 6, marginTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
