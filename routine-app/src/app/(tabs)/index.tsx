import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Keyboard, Pressable, ScrollView, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import Reanimated, { FadeIn, FadeInLeft, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { EarlierBlock, SearchResults, UpcomingBlock } from '@/components/home/feed-sections';
import { SearchField, toolRowLayout } from '@/components/home/search-field';
import { ToolButton } from '@/components/home/tool-button';
import { TodaySheet } from '@/components/home/today-sheet';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { CheckIcon, PaletteIcon, PlusIcon, TagIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { t as tr } from '@/i18n';
import { Fonts, Radii, SwatchColors, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { toISO } from '@/utils/dates';
import { addMinutesToTime, buildHomeFeed, findLiveActivityPlan } from '@/utils/home-feed';
import { groupSearchResults, searchPlans } from '@/utils/plan-search';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function greeting(hour: number) {
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

type Panel = 'colors' | 'groups';

/** Panel chips slide in one after another, 35ms apart, once the row has made room. */
const chipIn = (i: number) => FadeInLeft.delay(80 + i * 35).springify().damping(16).stiffness(200);

/** Home — design_handoff_tickle_home_7 (7a live / 7b idle / 7c ranges). */
export default function HomeScreen() {
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
  const filterGroupIds = usePlannerStore((s) => s.filterGroupIds);
  const toggleFilterGroup = usePlannerStore((s) => s.toggleFilterGroup);
  const clearFilterGroups = usePlannerStore((s) => s.clearFilterGroups);
  const filterColor = usePlannerStore((s) => s.filterColor);
  const setFilterColor = usePlannerStore((s) => s.setFilterColor);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const setSelectMode = usePlannerStore((s) => s.setSelectMode);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const pendingSaveToast = usePlannerStore((s) => s.pendingSaveToast);
  const setPendingSaveToast = usePlannerStore((s) => s.setPendingSaveToast);
  const liveActivitiesEnabled = usePlannerStore((s) => s.settings.liveActivitiesEnabled);

  // The search bar is always there; opening Colors or Groups collapses it into its icon on the
  // left to make room for that panel's chips. Only one panel is open at a time.
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState('');
  const [seeAll, setSeeAll] = useState(false);
  const searchRef = useRef<RNTextInput>(null);
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

  function togglePanel(which: Panel) {
    Keyboard.dismiss();
    setPanel(panel === which ? null : which);
  }

  function expandSearch() {
    setPanel(null);
    setTimeout(() => searchRef.current?.focus(), 260);
  }

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
      (filterGroupIds.length === 0 || (!!p.groupId && filterGroupIds.includes(p.groupId))) && (!filterColor || p.color === filterColor),
    [filterGroupIds, filterColor]
  );
  const feed = useMemo(() => buildHomeFeed(plans, nowMs, matches), [plans, nowMs, matches]);
  const searching = query.trim().length > 0;
  const searchSections = useMemo(
    () => (searching ? groupSearchResults(searchPlans(plans.filter(matches), groups, query, nowMs), nowMs) : []),
    [searching, plans, matches, groups, query, nowMs]
  );
  const liveActivity = useMemo(
    () => (liveActivitiesEnabled ? findLiveActivityPlan(plans.filter(matches), nowMs) : null),
    [liveActivitiesEnabled, plans, matches, nowMs]
  );
  // Only today's rail shows a "starts in" countdown (and needs the per-second clock); a task on a
  // later day still gets the Lock Screen countdown via useLiveActivitySync.
  const countdownPlanId =
    liveActivity?.phase === 'upcoming' && liveActivity.plan.date === toISO(new Date(nowMs)) ? liveActivity.plan.id : null;
  const fast = !!feed.live || !!countdownPlanId;
  useEffect(() => setFastClock(fast), [fast]);

  const now = new Date(nowMs);
  const todayISO = toISO(now);
  const firstName = profileName.trim().split(/\s+/)[0];

  const openPlan = (id: string) => router.push({ pathname: '/add-plan', params: { id } });
  const filtering = filterGroupIds.length > 0 || !!filterColor;
  // The Groups button's dot shows the first selected group's color.
  const activeGroup = groups.find((g) => filterGroupIds.includes(g.id));
  const emptyText = filtering
    ? tr('home.empty.filter')
    : feed.earlier.length > 0
      ? tr('home.empty.allDone')
      : tr('home.empty.nothing');

  const selectProps = { selectMode, selectedIds, onToggleSelect: toggleSelected, onOpen: openPlan };

  const chipText = (active: boolean) => ({
    color: active ? theme.accentStrong : theme.text,
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: Fonts[700],
  });

  return (
    <View style={[styles.screen, { backgroundColor: k.page }]}>
      <NestableScrollContainer contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 130 }} keyboardDismissMode="on-drag">
        {/* A tap on empty space unfocuses the search bar (fading its azure focus ring) — done here
            rather than via keyboardShouldPersistTaps, which only fires while the on-screen keyboard
            is showing (not with a hardware keyboard). Buttons and rows still take their own taps. */}
        <Pressable onPress={() => searchRef.current?.blur()} accessible={false}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Tickle size={34} mood="idle" animated />
              <Text numberOfLines={1} style={[t.greeting, styles.headerText, { color: k.ink }]}>
                {firstName ? tr('home.greeting.withName', { greeting: greeting(now.getHours()), name: firstName }) : greeting(now.getHours())}
              </Text>
            </View>
            <Pressable onPress={() => setSelectMode(!selectMode)} hitSlop={10}>
              <Text style={[t.link, styles.editBtn, { color: k.link }]}>{selectMode ? tr('common.done') : tr('home.edit')}</Text>
            </Pressable>
          </View>

          <View style={styles.toolRow}>
            <SearchField value={query} onChangeText={setQuery} inputRef={searchRef} collapsed={!!panel} active={searching} onExpand={expandSearch} />
            <ToolButton open={panel === 'colors'} label={tr('home.colors')} dot={filterColor} icon={(c) => <PaletteIcon size={16} color={c} />} onPress={() => togglePanel('colors')} />
            <ToolButton open={panel === 'groups'} label={tr('home.groups')} dot={activeGroup?.color} icon={(c) => <TagIcon size={16} color={c} />} onPress={() => togglePanel('groups')} />
            {panel && (
              // Keyed by panel: switching Colors ⇄ Groups fades the old chips out while the new
              // ones slide in one by one, instead of swapping in place.
              <Reanimated.View key={panel} entering={FadeIn.duration(160)} exiting={FadeOut.duration(110)} layout={toolRowLayout} style={styles.panel}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelRow}>
                  <View style={[styles.chipDivider, { backgroundColor: theme.cardBorder }]} />
                  {panel === 'colors' ? (
                    <>
                      <BouncyPressable
                        entering={chipIn(0)}
                        onPress={() => setFilterColor(null)}
                        style={[
                          styles.chip,
                          { borderColor: filterColor === null ? 'transparent' : theme.cardBorder, backgroundColor: filterColor === null ? theme.accentSoft : theme.surface },
                        ]}>
                        <Text style={chipText(filterColor === null)}>{tr('home.all')}</Text>
                      </BouncyPressable>
                      {SwatchColors.map((c, i) => (
                        <BouncyPressable
                          key={c}
                          entering={chipIn(i + 1)}
                          onPress={() => setFilterColor(filterColor === c ? null : c)}
                          style={[styles.colorSwatch, { backgroundColor: c, borderColor: filterColor === c ? theme.text : 'transparent' }]}>
                          {filterColor === c && (
                            <Reanimated.View entering={ZoomIn.springify().damping(12)}>
                              <CheckIcon size={14} color="#fff" strokeWidth={3} />
                            </Reanimated.View>
                          )}
                        </BouncyPressable>
                      ))}
                    </>
                  ) : groups.length === 0 ? (
                    <BouncyPressable entering={chipIn(0)} onPress={openCreateGroup} style={[styles.chip, styles.dashedChip, { borderColor: theme.dividerStrong }]}>
                      <Text style={[chipText(false), { color: theme.textSecondary }]}>{tr('home.noGroups')}</Text>
                      <Text style={chipText(true)}>{tr('home.createOne')}</Text>
                    </BouncyPressable>
                  ) : (
                    <>
                      <BouncyPressable
                        entering={chipIn(0)}
                        onPress={clearFilterGroups}
                        style={[
                          styles.chip,
                          {
                            borderColor: filterGroupIds.length === 0 ? 'transparent' : theme.cardBorder,
                            backgroundColor: filterGroupIds.length === 0 ? theme.accentSoft : theme.surface,
                          },
                        ]}>
                        <Text style={chipText(filterGroupIds.length === 0)}>{tr('home.all')}</Text>
                      </BouncyPressable>
                      {groups.map((g, i) => {
                        const on = filterGroupIds.includes(g.id);
                        return (
                          <BouncyPressable
                            key={g.id}
                            entering={chipIn(i + 1)}
                            onPress={() => toggleFilterGroup(g.id)}
                            accessibilityState={{ selected: on }}
                            style={[styles.chip, { borderColor: on ? 'transparent' : theme.cardBorder, backgroundColor: on ? g.color : theme.surface }]}>
                            {on ? (
                              <Reanimated.View entering={ZoomIn.springify().damping(12)}>
                                <CheckIcon size={11} color="#fff" strokeWidth={3} />
                              </Reanimated.View>
                            ) : (
                              <View style={[styles.chipDot, { backgroundColor: g.color }]} />
                            )}
                            <Text style={[chipText(false), on && { color: '#fff' }]}>{g.name}</Text>
                          </BouncyPressable>
                        );
                      })}
                      <BouncyPressable entering={chipIn(groups.length + 1)} onPress={openCreateGroup} accessibilityLabel={tr('home.createGroup')} style={[styles.chip, styles.dashedChip, { borderColor: theme.dividerStrong }]}>
                        <PlusIcon size={11} color={theme.accentStrong} strokeWidth={2.6} />
                        <Text style={chipText(true)}>{tr('home.newChip')}</Text>
                      </BouncyPressable>
                    </>
                  )}
                </ScrollView>
              </Reanimated.View>
            )}
          </View>

          {searching ? (
            <View style={styles.feed}>
              <SearchResults sections={searchSections} groups={groups} {...selectProps} />
            </View>
          ) : (
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
                  <Text style={{ color: theme.textSecondary, fontSize: Typography.rowValue, fontWeight: '500' }}>{tr('home.undoDelete')}</Text>
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
          )}
        </Pressable>
      </NestableScrollContainer>

      <Toast message={toastMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 22, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  headerText: { flexShrink: 1 },
  editBtn: { fontSize: 12 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 14 },
  panel: { flex: 1 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.chip + 6, borderWidth: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipDivider: { width: 1, height: 18 },
  colorSwatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dashedChip: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  feed: { paddingHorizontal: 12, gap: 20 },
  undoBar: { marginTop: -8, padding: 10, borderRadius: Radii.card, borderWidth: 1, alignItems: 'center' },
});
