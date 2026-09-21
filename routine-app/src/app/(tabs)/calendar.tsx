import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthView } from '@/components/calendar/month-view';
import { WeekView } from '@/components/calendar/week-view';
import { YearView } from '@/components/calendar/year-view';
import { PlusIcon } from '@/components/icon';
import { SegmentedControl } from '@/components/segmented-control';
import { TodoItem } from '@/components/todo-item';
import { Radii, Typography } from '@/constants/theme';
import { useHolidays } from '@/hooks/use-holidays';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { CalendarDensity } from '@/store/types';
import { toISO } from '@/utils/dates';
import { colorForPlan } from '@/utils/plans';

type CalView = 'week' | 'month' | 'year';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const BLUR_START = 22;

// Same staggered entrance as Today's tasks lists / Progress's cards (src/app/(tabs)/index.tsx,
// progress.tsx) — 100ms apart, applied below the "Calendar" title, which is left alone. contentEnter
// covers whichever of Month/Week/Year is showing — they're mutually exclusive, so reusing one
// Animated pair across the three conditional branches is safe (only one ever mounts at a time).
const ENTER_DELAY = { viewSwitch: 50, density: 150, content: 250, dayDetail: 350 };

function useEntrance(delayMs: number, playToken: number) {
  const v = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playToken) return;
    v.setValue(0);
    blur.setValue(0);
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(v, { toValue: 1, duration: 320, easing: EASE, useNativeDriver: true }),
        Animated.timing(blur, { toValue: 1, duration: 320, easing: EASE, useNativeDriver: false }),
      ]).start();
    }, delayMs);
    return () => clearTimeout(t);
  }, [v, blur, delayMs, playToken]);
  return {
    style: { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }) }] },
    blurIntensity: blur.interpolate({ inputRange: [0, 1], outputRange: [BLUR_START, 0] }),
  };
}

type Entrance = ReturnType<typeof useEntrance>;

function EntranceBox({ entrance, blurTint, children }: { entrance: Entrance; blurTint: 'light' | 'dark'; children: ReactNode }) {
  return (
    <Animated.View style={entrance.style}>
      {children}
      <AnimatedBlurView pointerEvents="none" tint={blurTint} intensity={entrance.blurIntensity} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export default function CalendarScreen() {
  const theme = useTheme();
  const blurTint = useEffectiveScheme() === 'dark' ? 'dark' : 'light';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const calendarDensity = usePlannerStore((s) => s.settings.calendarDensity);
  const updateSettings = usePlannerStore((s) => s.updateSettings);

  const [enterToken, setEnterToken] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterToken(Date.now());
    }, [])
  );

  const viewSwitchEnter = useEntrance(ENTER_DELAY.viewSwitch, enterToken);
  const densityEnter = useEntrance(ENTER_DELAY.density, enterToken);
  const contentEnter = useEntrance(ENTER_DELAY.content, enterToken);
  const dayDetailEnter = useEntrance(ENTER_DELAY.dayDetail, enterToken);

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

  function goToTodayMonth() {
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    handleSelectDate(todayISO);
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

        <EntranceBox entrance={viewSwitchEnter} blurTint={blurTint}>
          <SegmentedControl
            value={calView}
            onChange={setCalView}
            options={[
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
              { label: 'Year', value: 'year' },
            ]}
          />
        </EntranceBox>

        {calView === 'month' && (
          <>
            <EntranceBox entrance={densityEnter} blurTint={blurTint}>
              <SegmentedControl
                value={calendarDensity}
                onChange={(v: CalendarDensity) => updateSettings({ calendarDensity: v })}
                options={[
                  { label: 'Compact', value: 'compact' },
                  { label: 'Detailed', value: 'detailed' },
                ]}
                style={styles.densitySwitch}
              />
            </EntranceBox>
            <EntranceBox entrance={contentEnter} blurTint={blurTint}>
              <MonthView
                year={calYear}
                month={calMonth}
                todayISO={todayISO}
                selectedDate={selectedDate}
                plans={plans}
                colorForPlan={getColor}
                onSelectDate={handleSelectDate}
                onShiftMonth={shiftMonth}
                onToday={goToTodayMonth}
                density={calendarDensity}
                holidayByDate={holidays}
              />
            </EntranceBox>
            <EntranceBox entrance={dayDetailEnter} blurTint={blurTint}>
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
            </EntranceBox>
          </>
        )}

        {calView === 'week' && (
          <EntranceBox entrance={contentEnter} blurTint={blurTint}>
            <WeekView
              selectedDate={selectedDate}
              todayISO={todayISO}
              plans={plans}
              colorForPlan={getColor}
              onShiftWeek={shiftWeek}
              onToday={() => setSelectedDate(todayISO)}
              onPressPlan={(id) => router.push({ pathname: '/add-plan', params: { id } })}
            />
          </EntranceBox>
        )}

        {calView === 'year' && (
          <EntranceBox entrance={contentEnter} blurTint={blurTint}>
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
          </EntranceBox>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  h1: { fontSize: Typography.display, fontWeight: '800', letterSpacing: -0.4, paddingHorizontal: 22, marginBottom: 4 },
  densitySwitch: { marginTop: 9, marginBottom: 10 },
  dayDetail: { marginTop: 16 },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 10 },
  dayDetailTitle: { fontSize: Typography.heading, fontWeight: '700' },
  holidayLabel: { fontSize: Typography.body, fontWeight: '600', marginTop: 2 },
  addBtn: { width: 28, height: 28, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
});
