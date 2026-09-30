import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EarlierBlock, UpcomingBlock } from '@/components/home/feed-sections';
import { TodaySheet } from '@/components/home/today-sheet';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { CheckIcon } from '@/components/icon';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { Fonts, Radii, SwatchColors, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { toISO } from '@/utils/dates';
import { addMinutesToTime, buildHomeFeed, findLiveActivityPlan } from '@/utils/home-feed';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Wed, 14 May" */
function dateLine(d: Date) {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${d.getDate()} ${month}`;
}

/**
 * Wall clock for the feed: ticks every second while a session is live (for its countdown),
 * otherwise once a minute on the minute (for the Now line and live/missed transitions).
 */
function useClock(fast: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      timer = setTimeout(tick, fast ? 1000 - (t % 1000) : 60_000 - (t % 60_000));
    };
    tick();
    return () => clearTimeout(timer);
  }, [fast]);
  return now;
}

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const BLUR_START = 22;

// Entrance for the three feed blocks (Today sheet, Upcoming, Earlier) — 100ms apart, same style
// of animation as src/app/subscription.tsx's per-section entrance. playToken changes on every screen
// focus (including the first), so it replays each time the user comes back to Today — not just on
// mount. Drives both the fade/slide-up (native driver) and a dissolving BlurView veil on top
// (JS-driven — `intensity` isn't an animatable style prop, so it can't ride the same native-driven
// timing).
const ENTER_DELAY = { today: 50, upcoming: 150, earlier: 250 };
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

/** Wraps a section with the fade/slide-up entrance plus a frosted-glass veil that clears as it lands. */
function EntranceBox({ entrance, blurTint, children }: { entrance: Entrance; blurTint: 'light' | 'dark'; children: ReactNode }) {
  return (
    <Animated.View style={entrance.style}>
      {children}
      <AnimatedBlurView pointerEvents="none" tint={blurTint} intensity={entrance.blurIntensity} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Home — design_handoff_tickle_home_7 (7a live / 7b idle / 7c ranges). */
export default function TodayScreen() {
  const theme = useTheme();
  const k = useHomeTokens();
  const t = useHomeType();
  const blurTint = useEffectiveScheme() === 'dark' ? 'dark' : 'light';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const profileName = usePlannerStore((s) => s.profile.name);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const updatePlan = usePlannerStore((s) => s.updatePlan);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const reorderPlans = usePlannerStore((s) => s.reorderPlans);
  const undoDelete = usePlannerStore((s) => s.undoDelete);
  const lastDeletedSnapshot = usePlannerStore((s) => s.lastDeletedSnapshot);
  const filterGroupId = usePlannerStore((s) => s.filterGroupId);
  const setFilterGroupId = usePlannerStore((s) => s.setFilterGroupId);
  const filterColor = usePlannerStore((s) => s.filterColor);
  const setFilterColor = usePlannerStore((s) => s.setFilterColor);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const setSelectMode = usePlannerStore((s) => s.setSelectMode);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const pendingSaveToast = usePlannerStore((s) => s.pendingSaveToast);
  const setPendingSaveToast = usePlannerStore((s) => s.setPendingSaveToast);
  const liveActivitiesEnabled = usePlannerStore((s) => s.settings.liveActivitiesEnabled);

  const [colorsOpen, setColorsOpen] = useState(false);
  const [colorsMounted, setColorsMounted] = useState(false);
  const [seeAll, setSeeAll] = useState(false);
  const colorAnim = useRef(new Animated.Value(0)).current;
  const { toastMessage, showToast } = useToast();

  const [enterToken, setEnterToken] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterToken(Date.now());
    }, [])
  );

  const todayEnter = useEntrance(ENTER_DELAY.today, enterToken);
  const upcomingEnter = useEntrance(ENTER_DELAY.upcoming, enterToken);
  const earlierEnter = useEntrance(ENTER_DELAY.earlier, enterToken);

  function toggleColors() {
    if (!colorsOpen) {
      setColorsOpen(true);
      setColorsMounted(true);
      Animated.timing(colorAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    } else {
      setColorsOpen(false);
      Animated.timing(colorAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setColorsMounted(false);
      });
    }
  }

  useFocusEffect(
    useCallback(() => {
      return () => setSelectMode(false);
    }, [setSelectMode])
  );

  useFocusEffect(
    useCallback(() => {
      if (pendingSaveToast) {
        showToast(pendingSaveToast);
        setPendingSaveToast(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingSaveToast])
  );

  // The clock's speed depends on whether anything is live or counting down, which depends on the
  // clock — either starting is caught by the next minute tick, which then speeds the clock up.
  const [fastClock, setFastClock] = useState(false);
  const nowMs = useClock(fastClock);
  const matches = useCallback(
    (p: Plan) => (!filterGroupId || p.groupId === filterGroupId) && (!filterColor || p.color === filterColor),
    [filterGroupId, filterColor]
  );
  const feed = useMemo(() => buildHomeFeed(plans, nowMs, matches), [plans, nowMs, matches]);
  const liveActivity = useMemo(
    () => (liveActivitiesEnabled ? findLiveActivityPlan(plans.filter(matches), nowMs) : null),
    [liveActivitiesEnabled, plans, matches, nowMs]
  );
  const countdownPlanId = liveActivity?.phase === 'upcoming' ? liveActivity.plan.id : null;
  const fast = !!feed.live || !!countdownPlanId;
  useEffect(() => setFastClock(fast), [fast]);

  const now = new Date(nowMs);
  const todayISO = toISO(now);
  const firstName = profileName.trim().split(/\s+/)[0];

  const openPlan = (id: string) => router.push({ pathname: '/add-plan', params: { id } });
  const filtering = !!filterGroupId || !!filterColor;
  const emptyText = filtering
    ? 'Nothing matches this filter today.'
    : feed.earlier.length > 0
      ? 'All done for today.'
      : 'Nothing planned for today.';

  const selectProps = { selectMode, selectedIds, onToggleSelect: toggleSelected, onOpen: openPlan };

  const chipText = (active: boolean) => ({
    color: active ? theme.accentStrong : theme.text,
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: Fonts[700],
  });

  return (
    <View style={[styles.screen, { backgroundColor: k.page }]}>
      <NestableScrollContainer contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 130 }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Tickle size={34} mood="idle" animated />
            <View style={styles.headerText}>
              <Text numberOfLines={1} style={[t.greeting, { color: k.ink50 }]}>
                {greeting(now.getHours())}
                {firstName ? `, ${firstName}` : ''}
              </Text>
              <Text style={[t.date, { color: k.ink }]}>{dateLine(now)}</Text>
            </View>
          </View>
          <Pressable onPress={() => setSelectMode(!selectMode)} hitSlop={10}>
            <Text style={[t.link, styles.editBtn, { color: k.link }]}>{selectMode ? 'Done' : 'Edit'}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={toggleColors}
            style={[styles.chip, { borderColor: colorsOpen ? 'transparent' : theme.cardBorder, backgroundColor: colorsOpen ? theme.accentSoft : theme.surface }]}>
            <Text style={chipText(colorsOpen)}>Colors</Text>
          </Pressable>
          {colorsMounted && (
            <Animated.View
              style={[
                styles.colorRevealRow,
                {
                  opacity: colorAnim,
                  transform: [{ translateX: colorAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
                },
              ]}>
              <Pressable
                onPress={() => setFilterColor(null)}
                style={[
                  styles.chip,
                  { borderColor: filterColor === null ? 'transparent' : theme.cardBorder, backgroundColor: filterColor === null ? theme.accentSoft : theme.surface },
                ]}>
                <Text style={chipText(filterColor === null)}>All</Text>
              </Pressable>
              {SwatchColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setFilterColor(filterColor === c ? null : c)}
                  style={[styles.colorSwatch, { backgroundColor: c, borderColor: filterColor === c ? theme.text : 'transparent' }]}>
                  {filterColor === c && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
                </Pressable>
              ))}
            </Animated.View>
          )}
          {groups.length > 0 && (
            <>
              <View style={[styles.chipDivider, { backgroundColor: theme.cardBorder }]} />
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => setFilterGroupId(filterGroupId === g.id ? null : g.id)}
                  style={[styles.chip, { borderColor: theme.cardBorder, backgroundColor: filterGroupId === g.id ? g.color : theme.surface }]}>
                  {filterGroupId !== g.id && <View style={[styles.chipDot, { backgroundColor: g.color }]} />}
                  <Text style={[chipText(false), filterGroupId === g.id && { color: '#fff' }]}>{g.name}</Text>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.feed}>
          <EntranceBox entrance={todayEnter} blurTint={blurTint}>
            <TodaySheet
              feed={feed}
              nowMs={nowMs}
              groups={groups}
              emptyText={emptyText}
              countdownPlanId={countdownPlanId}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleComplete={toggleComplete}
              onToggleSelect={toggleSelected}
              onOpen={openPlan}
              onDelete={deletePlan}
              onExtend={(p) => p.endTime && updatePlan(p.id, { endTime: addMinutesToTime(p.endTime, 10) })}
              onReorder={(ids) => reorderPlans(todayISO, ids)}
            />
          </EntranceBox>

          {lastDeletedSnapshot && !selectMode && (
            <Pressable onPress={undoDelete} style={[styles.undoBar, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.rowValue, fontFamily: Fonts[500] }}>Undo last delete</Text>
            </Pressable>
          )}

          <EntranceBox entrance={upcomingEnter} blurTint={blurTint}>
            <UpcomingBlock items={feed.upcoming} onCalendar={() => router.navigate('/calendar')} {...selectProps} />
          </EntranceBox>

          <EntranceBox entrance={earlierEnter} blurTint={blurTint}>
            <EarlierBlock
              items={feed.earlier}
              older={feed.older}
              seeAll={seeAll}
              onToggleSeeAll={() => setSeeAll((v) => !v)}
              onRedo={openPlan}
              {...selectProps}
            />
          </EntranceBox>
        </View>
      </NestableScrollContainer>

      <Toast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 22, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  headerText: { gap: 1, flexShrink: 1 },
  editBtn: { fontSize: 12 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.chip + 6, borderWidth: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipDivider: { width: 1, height: 18 },
  colorSwatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorRevealRow: { flexDirection: 'row', gap: 8 },
  feed: { paddingHorizontal: 12, gap: 20 },
  undoBar: { marginTop: -8, padding: 10, borderRadius: Radii.card, borderWidth: 1, alignItems: 'center' },
});
