import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthView } from '@/components/calendar/month-view';
import { WeekView } from '@/components/calendar/week-view';
import { YearView } from '@/components/calendar/year-view';
import { PlusIcon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { TodoItem } from '@/components/todo-item';
import { Radii, Typography } from '@/constants/theme';
import { useHolidays } from '@/hooks/use-holidays';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { CalendarDensity } from '@/store/types';
import { toISO } from '@/utils/dates';
import { colorForPlan } from '@/utils/plans';

type CalView = 'week' | 'month' | 'year';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const calendarDensity = usePlannerStore((s) => s.settings.calendarDensity);
  const updateSettings = usePlannerStore((s) => s.updateSettings);

  const now = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISO(now), [now]);

  const [calView, setCalView] = useState<CalView>('month');
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const holidays = useHolidays(calYear);

  const scrollRef = useRef<ScrollView>(null);
  const dayDetailY = useRef(0);

  /** Tapping a date on the grid scrolls the packed dot/chip preview into full detail below. */
  function handleSelectDate(iso: string) {
    setSelectedDate(iso);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(dayDetailY.current - 16, 0), animated: true });
    });
  }

  function shiftMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setCalMonth(m);
    setCalYear(y);
  }

  function shiftWeek(deltaDays: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(toISO(d));
  }

  const getColor = (p: (typeof plans)[number]) => colorForPlan(p, groups, theme.accent);

  const selectedDayPlans = plans.filter((p) => p.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <Text style={[styles.h1, { color: theme.text }]}>Calendar</Text>

        <SegmentedControl
          value={calView}
          onChange={setCalView}
          options={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
        />

        {calView === 'month' && (
          <>
            <SegmentedControl
              value={calendarDensity}
              onChange={(v: CalendarDensity) => updateSettings({ calendarDensity: v })}
              options={[
                { label: 'Compact', value: 'compact' },
                { label: 'Detailed', value: 'detailed' },
              ]}
            />
            <MonthView
              year={calYear}
              month={calMonth}
              todayISO={todayISO}
              selectedDate={selectedDate}
              plans={plans}
              colorForPlan={getColor}
              onSelectDate={handleSelectDate}
              onShiftMonth={shiftMonth}
              density={calendarDensity}
              holidayByDate={holidays}
            />
            <View style={styles.dayDetail} onLayout={(e) => (dayDetailY.current = e.nativeEvent.layout.y)}>
              <View style={styles.dayDetailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayDetailTitle, { color: theme.textSecondary }]}>
                    {selectedDate === todayISO ? `Today, ${selectedDateLabel}` : selectedDateLabel}
                  </Text>
                  {holidays[selectedDate] && (
                    <Text style={[styles.holidayLabel, { color: theme.accent }]}>🎉 {holidays[selectedDate]}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/add-plan', params: { date: selectedDate } })}
                  style={[styles.addBtn, { backgroundColor: theme.accentSoft }]}
                  hitSlop={6}>
                  <PlusIcon size={16} color={theme.accent} strokeWidth={2.4} />
                </Pressable>
              </View>
              {selectedDayPlans.length === 0 ? (
                <Text style={{ color: theme.textTertiary, fontSize: Typography.body, paddingHorizontal: 22 }}>No plans on this day.</Text>
              ) : (
                selectedDayPlans.map((p) => (
                  <TodoItem
                    key={p.id}
                    plan={p}
                    group={groups.find((g) => g.id === p.groupId)}
                    selectMode={false}
                    selected={false}
                    onToggleComplete={() => toggleComplete(p.id)}
                    onToggleSelect={() => {}}
                    onPress={() => router.push({ pathname: '/add-plan', params: { id: p.id } })}
                    onDelete={() => deletePlan(p.id)}
                    onDrag={() => {}}
                  />
                ))
              )}
            </View>
          </>
        )}

        {calView === 'week' && (
          <WeekView
            selectedDate={selectedDate}
            todayISO={todayISO}
            plans={plans}
            colorForPlan={getColor}
            onShiftWeek={shiftWeek}
            onPressPlan={(id) => router.push({ pathname: '/add-plan', params: { id } })}
          />
        )}

        {calView === 'year' && (
          <YearView
            year={calYear}
            todayISO={todayISO}
            plans={plans}
            onShiftYear={(delta) => setCalYear((y) => y + delta)}
            onPressMonth={(m) => {
              setCalMonth(m);
              setCalView('month');
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  h1: { fontSize: Typography.display, fontWeight: '800', letterSpacing: -0.4, paddingHorizontal: 22, marginBottom: 4 },
  dayDetail: { marginTop: 16 },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 10 },
  dayDetailTitle: { fontSize: Typography.heading, fontWeight: '700' },
  holidayLabel: { fontSize: Typography.body, fontWeight: '600', marginTop: 2 },
  addBtn: { width: 28, height: 28, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
});
