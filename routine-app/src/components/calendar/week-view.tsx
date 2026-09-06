import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { buildWeekDates, MONTHS, WEEKDAY_SHORT } from '@/utils/calendar';
import { fmtTime12, fromISO } from '@/utils/dates';

interface Props {
  selectedDate: string;
  todayISO: string;
  plans: Plan[];
  colorForPlan: (p: Plan) => string;
  onShiftWeek: (deltaDays: number) => void;
  onToday: () => void;
  onPressPlan: (id: string) => void;
}

export function WeekView({ selectedDate, todayISO, plans, colorForPlan, onShiftWeek, onToday, onPressPlan }: Props) {
  const theme = useTheme();
  const weekDates = buildWeekDates(selectedDate, fromISO);
  const start = fromISO(weekDates[0]);
  const end = fromISO(weekDates[6]);
  const isCurrentWeek = weekDates.includes(todayISO);

  return (
    <View>
      <View style={styles.nav}>
        <Text style={[styles.navLabel, { color: theme.text }]}>
          {MONTHS[start.getMonth()].slice(0, 3)} {start.getDate()} – {MONTHS[end.getMonth()].slice(0, 3)} {end.getDate()}
        </Text>
        <View style={styles.navActions}>
          {!isCurrentWeek && (
            <Pressable onPress={onToday} hitSlop={8}>
              <Text style={[styles.todayBtn, { color: theme.accentStrong }]}>Today</Text>
            </Pressable>
          )}
          <View style={styles.arrows}>
            <Pressable onPress={() => onShiftWeek(-7)} style={[styles.arrowBtn, { borderColor: theme.cardBorder }]}>
              <ChevronLeftIcon size={14} color={theme.text} strokeWidth={2.3} />
            </Pressable>
            <Pressable onPress={() => onShiftWeek(7)} style={[styles.arrowBtn, { borderColor: theme.cardBorder }]}>
              <ChevronRightIcon size={14} color={theme.text} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
      </View>

      {weekDates.map((iso) => {
        const d = fromISO(iso);
        const isToday = iso === todayISO;
        const dayPlans = plans.filter((p) => p.date === iso).sort((a, b) => a.time.localeCompare(b.time));

        return (
          <View key={iso} style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={[styles.blockHead, { backgroundColor: isToday ? theme.accentSoft : theme.surface2, borderColor: theme.cardBorder }]}>
              <Text style={[styles.blockHeadText, { color: isToday ? theme.accentStrong : theme.text }]}>
                {WEEKDAY_SHORT[d.getDay()]} {d.getDate()}
                {isToday ? ' · Today' : ''}
              </Text>
            </View>
            {dayPlans.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textTertiary }]}>No plans</Text>
            ) : (
              dayPlans.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPressPlan(p.id)}
                  style={[styles.planRow, { borderColor: theme.cardBorder, borderLeftColor: colorForPlan(p) }]}>
                  <Text style={[styles.planTime, { color: theme.accentStrong }]}>{p.allDay ? 'All Day' : fmtTime12(p.time)}</Text>
                  <Text numberOfLines={1} style={[styles.planName, { color: theme.text }]}>
                    {p.name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 10 },
  navLabel: { fontSize: Typography.title, fontWeight: '800', letterSpacing: -0.2 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  todayBtn: { fontSize: Typography.body, fontWeight: '700' },
  arrows: { flexDirection: 'row', gap: 8 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  block: { borderRadius: Radii.button, borderWidth: 1, overflow: 'hidden', marginHorizontal: 14, marginBottom: 12 },
  blockHead: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1 },
  blockHeadText: { fontSize: Typography.body, fontWeight: '700' },
  empty: { padding: 14, fontSize: Typography.body },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 14, borderLeftWidth: 3, borderBottomWidth: 1 },
  planTime: { fontSize: Typography.body, fontWeight: '700', width: 62 },
  planName: { flex: 1, fontSize: Typography.body, fontWeight: '600' },
});
