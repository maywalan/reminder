import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MenuAction } from '@react-native-menu/menu';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EarlierBlock, UpcomingBlock } from '@/components/home/feed-sections';
import { DayTimeline } from '@/components/home/day-timeline';
import { FilterMenuButton } from '@/components/home/filter-menu-button';
import { addDays, FEED_INSET, startOfWeek, WeekStrip } from '@/components/home/week-strip';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { PaletteIcon, TagIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { UndoToast } from '@/components/home/undo-toast';
import { t as tr } from '@/i18n';
import { fmtDate } from '@/i18n/format';
import { SwatchColorNames, SwatchColors } from '@/constants/theme';
import { useEffectiveScheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { toISO } from '@/utils/dates';
import { planDateTime, planEndDateTime } from '@/utils/countdown';
import { buildHomeFeed, findLiveActivityPlan, START_TICK_MS } from '@/utils/home-feed';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function greeting(hour: number) {
  // After midnight neither "good morning" nor "good evening" fits.
  if (hour < 5) return tr('home.greeting.night');
  if (hour < 12) return tr('home.greeting.morning');
  if (hour < 18) return tr('home.greeting.afternoon');
  return tr('home.greeting.evening');
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

// Entrance for the feed sheet's two halves (the day timeline, then Upcoming + Earlier) — 100ms apart, same style
// of animation as src/app/subscription.tsx's per-section entrance. playToken changes on every screen
// focus (including the first), so it replays each time the user comes back to Today — not just on
// mount. Drives both the fade/slide-up (native driver) and a dissolving BlurView veil on top
// (JS-driven — `intensity` isn't an animatable style prop, so it can't ride the same native-driven
// timing).
const ENTER_DELAY = { today: 50, earlier: 150 };
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

/**
 * Home — header, search and filters from design_handoff_tickle_home_7; the week strip and the feed
 * sheet (day timeline · Upcoming · Earlier) from design_handoff_tickle_home_timeline.
 */
export default function HomeScreen() {
  const k = useHomeTokens();
  const t = useHomeType();
  const blurTint = useEffectiveScheme() === 'dark' ? 'dark' : 'light';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const profileName = usePlannerStore((s) => s.profile.name);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const reorderPlans = usePlannerStore((s) => s.reorderPlans);
  const undoDelete = usePlannerStore((s) => s.undoDelete);
  const lastDeletedSnapshot = usePlannerStore((s) => s.lastDeletedSnapshot);
  const clearDeletedSnapshot = usePlannerStore((s) => s.clearDeletedSnapshot);
  const filterGroupIds = usePlannerStore((s) => s.filterGroupIds);
  const toggleFilterGroup = usePlannerStore((s) => s.toggleFilterGroup);
  const clearFilterGroups = usePlannerStore((s) => s.clearFilterGroups);
  const filterColors = usePlannerStore((s) => s.filterColors);
  const toggleFilterColor = usePlannerStore((s) => s.toggleFilterColor);
  const clearFilterColors = usePlannerStore((s) => s.clearFilterColors);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const setSelectMode = usePlannerStore((s) => s.setSelectMode);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const pendingSaveToast = usePlannerStore((s) => s.pendingSaveToast);
  const setPendingSaveToast = usePlannerStore((s) => s.setPendingSaveToast);
  const liveActivitiesEnabled = usePlannerStore((s) => s.settings.liveActivitiesEnabled);

  const [seeAll, setSeeAll] = useState(false);
  const { toastMessage, showToast } = useToast();

  const [enterToken, setEnterToken] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterToken(Date.now());
    }, [])
  );

  const todayEnter = useEntrance(ENTER_DELAY.today, enterToken);
  const earlierEnter = useEntrance(ENTER_DELAY.earlier, enterToken);

  const openCreateGroup = () => router.push('/create-group');

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
    (p: Plan) =>
      (filterGroupIds.length === 0 || (!!p.groupId && filterGroupIds.includes(p.groupId))) && (filterColors.length === 0 || filterColors.includes(p.color)),
    [filterGroupIds, filterColors]
  );
  // Week strip: `weekOffset` weeks from the current one, and the picked day (today on open).
  const todayISO = toISO(new Date(nowMs));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const thisWeekStart = useMemo(() => startOfWeek(new Date(`${todayISO}T00:00:00`)), [todayISO]);
  const weekStart = addDays(thisWeekStart, weekOffset * 7);
  // Past midnight the strip jumps to the new today, so "Today" never points at yesterday.
  const prevToday = useRef(todayISO);
  useEffect(() => {
    if (prevToday.current === todayISO) return;
    prevToday.current = todayISO;
    setWeekOffset(0);
    setSelectedISO(todayISO);
  }, [todayISO]);
  const stepWeek = (delta: -1 | 1) => {
    setWeekOffset(weekOffset + delta);
    setSelectedISO(toISO(addDays(thisWeekStart, (weekOffset + delta) * 7)));
  };
  const backToToday = () => {
    setWeekOffset(0);
    setSelectedISO(todayISO);
  };

  const feed = useMemo(() => buildHomeFeed(plans, nowMs, matches, selectedISO), [plans, nowMs, matches, selectedISO]);
  const markedISOs = useMemo(() => new Set(plans.filter(matches).map((p) => p.date)), [plans, matches]);
  const liveActivity = useMemo(
    () => (liveActivitiesEnabled ? findLiveActivityPlan(plans.filter(matches), nowMs) : null),
    [liveActivitiesEnabled, plans, matches, nowMs]
  );
  // Only today's rail shows a "starts in" countdown (and needs the per-second clock); a task on a
  // later day still gets the Lock Screen countdown via useLiveActivitySync.
  const countdownPlanId =
    liveActivity?.phase === 'upcoming' && liveActivity.plan.date === toISO(new Date(nowMs)) ? liveActivity.plan.id : null;
  // The "starts in" line only shows seconds in its last 10 minutes; before that the minute clock is enough.
  const countdownTicking = !!countdownPlanId && !!liveActivity && planDateTime(liveActivity.plan).getTime() - nowMs <= START_TICK_MS;
  // Seconds only matter while a range counts down to its end; overtime and a due reminder read in minutes.
  const liveEndMs = feed.live?.endTime ? planEndDateTime(feed.live)?.getTime() : undefined;
  const liveTicking = liveEndMs !== undefined && liveEndMs > nowMs;
  const fast = liveTicking || countdownTicking;
  useEffect(() => setFastClock(fast), [fast]);

  const now = new Date(nowMs);
  const firstName = profileName.trim().split(/\s+/)[0];

  const openPlan = (id: string) => router.push({ pathname: '/add-plan', params: { id } });
  const filtering = filterGroupIds.length > 0 || filterColors.length > 0;
  // The Groups button's dot shows the first selected group's color.
  const activeGroup = groups.find((g) => filterGroupIds.includes(g.id));
  const emptyText = feed.isToday
    ? filtering
      ? tr('home.empty.filter')
      : tr('home.empty.nothing')
    : filtering
      ? tr('home.empty.dayFilter')
      : tr('home.empty.day');

  const selectProps = { selectMode, selectedIds, onToggleSelect: toggleSelected, onOpen: openPlan };

  // Native iOS pull-down menus for the two filters (user, 2026-10-25). Each tap toggles one item
  // and closes the menu, as UIMenu does; "All" clears that filter.
  const colorActions: MenuAction[] = [
    { id: 'all', title: tr('home.all'), state: filterColors.length === 0 ? 'on' : 'off' },
    {
      id: 'swatches',
      title: '',
      displayInline: true,
      subactions: SwatchColors.map((c) => ({
        id: c,
        title: tr(SwatchColorNames[c] ?? 'color.other'),
        image: 'circle.fill',
        imageColor: c,
        state: filterColors.includes(c) ? 'on' : 'off',
      })),
    },
  ];
  const newGroupAction: MenuAction = { id: 'new', title: tr('home.createGroup'), image: 'plus' };
  const groupActions: MenuAction[] =
    groups.length === 0
      ? [newGroupAction]
      : [
          { id: 'all', title: tr('home.all'), state: filterGroupIds.length === 0 ? 'on' : 'off' },
          {
            id: 'groups',
            title: '',
            displayInline: true,
            subactions: groups.map((g) => ({
              id: g.id,
              title: g.name,
              image: 'circle.fill',
              imageColor: g.color,
              state: filterGroupIds.includes(g.id) ? 'on' : 'off',
            })),
          },
          { id: 'create', title: '', displayInline: true, subactions: [newGroupAction] },
        ];
  const onColorAction = (id: string) => (id === 'all' ? clearFilterColors() : toggleFilterColor(id));
  const onGroupAction = (id: string) => (id === 'new' ? openCreateGroup() : id === 'all' ? clearFilterGroups() : toggleFilterGroup(id));

  return (
    <View style={[styles.screen, { backgroundColor: k.page }]}>
      <NestableScrollContainer
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 130 }}
        keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Tickle size={34} mood="idle" animated />
            {/* Today's date under the greeting, smaller and grey (user, 2026-10-25). */}
            <View style={styles.headerText}>
              <Text numberOfLines={1} style={[t.greeting, { color: k.ink }]}>
                {firstName ? tr('home.greeting.withName', { greeting: greeting(now.getHours()), name: firstName }) : greeting(now.getHours())}
              </Text>
              <Text numberOfLines={1} style={[t.todayDate, { color: k.ink50 }]}>
                {fmtDate(now, { weekday: 'long', month: 'long' }, 'dm')}
              </Text>
            </View>
          </View>
          <View style={styles.headerTools}>
            <FilterMenuButton label={tr('home.colors')} dot={filterColors[0]} icon={(c) => <PaletteIcon size={16} color={c} />} actions={colorActions} onAction={onColorAction} />
            <FilterMenuButton label={tr('home.groups')} dot={activeGroup?.color} icon={(c) => <TagIcon size={16} color={c} />} actions={groupActions} onAction={onGroupAction} />
          </View>
        </View>

        <View style={styles.feedArea}>
          {/* The week strip and the selected day's timeline share the white box (user's reference, 2026-10-22); Upcoming and Earlier live on the grey page below it. */}
          <EntranceBox entrance={todayEnter} blurTint={blurTint}>
            <View style={[styles.todayBox, { backgroundColor: k.sheet, borderColor: k.sheetBorder }]}>
            <WeekStrip
              weekStart={weekStart}
              weekOffset={weekOffset}
              selectedISO={selectedISO}
              todayISO={todayISO}
              markedISOs={markedISOs}
              onStep={stepWeek}
              onToday={backToToday}
              onSelect={setSelectedISO}
              embedded
            />
            <DayTimeline
              feed={feed}
              nowMs={nowMs}
              emptyText={emptyText}
              countdownPlanId={feed.isToday ? countdownPlanId : null}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleComplete={toggleComplete}
              onToggleSelect={toggleSelected}
              onOpen={openPlan}
              onDelete={deletePlan}
              onReorder={(ids) => reorderPlans(selectedISO, ids)}
              onToggleEdit={() => setSelectMode(!selectMode)}
            />
            </View>
          </EntranceBox>

          <EntranceBox entrance={earlierEnter} blurTint={blurTint}>
            <UpcomingBlock days={feed.upcoming} groups={groups} {...selectProps} />
            <EarlierBlock older={feed.older} seeAll={seeAll} onToggleSeeAll={() => setSeeAll((v) => !v)} {...selectProps} />
          </EntranceBox>
        </View>
      </NestableScrollContainer>

      {/* The feed fades into the page above the tab bar, so whatever sits under the + button at rest dissolves instead of being cut off (critique, 2026-10-28). */}
      <LinearGradient pointerEvents="none" colors={[`${k.page}00`, k.page]} style={styles.bottomFade} />

      {/* Scrolled content passes under the status bar on a band of page colour instead of colliding with the clock (critique, 2026-10-28). */}
      <View pointerEvents="none" style={[styles.statusBand, { height: insets.top }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: k.page }]} />
        <LinearGradient colors={[k.page, `${k.page}00`]} style={styles.statusFade} />
      </View>

      <UndoToast visible={!!lastDeletedSnapshot && !selectMode} onUndo={undoDelete} onExpire={clearDeletedSnapshot} />

      <Toast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The filter buttons' right edge lines up with the Today box (FEED_INSET).
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8, paddingLeft: 22, paddingRight: FEED_INSET, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  headerText: { flexShrink: 1 },
  headerTools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // The week strip lives inside the Today box, so only a small gap under the header.
  feedArea: { paddingHorizontal: FEED_INSET, paddingTop: 12 },
  // The old Home's floating Today card (design_handoff_tickle_home_7) with a subtle drop shadow.
  todayBox: {
    borderRadius: 22,
    borderWidth: 1,
    // Roomier inside, same outer size (user, 2026-10-19).
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    shadowColor: '#10203A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  statusBand: { position: 'absolute', top: 0, left: 0, right: 0 },
  statusFade: { position: 'absolute', top: '100%', left: 0, right: 0, height: 14 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
});
