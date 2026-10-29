import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BorderlessButton, RectButton, Swipeable } from 'react-native-gesture-handler';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import Reanimated, { Easing as REasing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';

import { CheckIcon, ClockIcon, PlanIcon, TrashIcon, XIcon } from '@/components/icon';
import { planPalette, useHomeTokens, useHomeType } from '@/components/home/tokens';
import { Text } from '@/components/text';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t as tr } from '@/i18n';
import { fmtDate, fmtTime, fmtTimeRange, monthShort, weekdayShort, lang, uses12hTime } from '@/i18n/format';
import type { Plan } from '@/store/types';
import { usePlannerStore } from '@/store/use-planner-store';
import { planDateTime } from '@/utils/countdown';
import { confirmPlanDelete } from '@/utils/repeat-scope';
import { fromISO, toISO } from '@/utils/dates';
import { dueProgress, formatDuration, formatLiveCountdown, formatStartsIn, isMissedToday, liveProgress, type HomeFeed } from '@/utils/home-feed';
import { resolvePlanIcon } from '@/utils/plan-icons';

/**
 * The day section at the top of Home's feed sheet (design_handoff_tickle_home_timeline, "1a.
 * Today"): a title that follows the week strip's selection, then one timeline row per plan — a
 * card tinted in the plan's colour with its icon tile on the left, title and time next to it, and a check
 * button behind a divider on the right (user's reference, 2026-10-22).
 *
 * The time column and rail are the previous Home's (design_handoff_tickle_home_7; user's call,
 * 2026-10-18): right-aligned start time with the end time under it, a thin rail through every row,
 * a hollow ring for a point reminder, a tinted bar for a range, a solid green dot once done, and
 * for the running plan a line that fills as time passes with a pulsing Now dot in the plan's colour.
 *
 * Kept from the previous Home (user's call, 2026-10-18): swipe left to delete, Edit-mode
 * multi-select and long-press drag to reorder. The +10 min link on the live plan was removed (user, 2026-10-22).
 */

const TIME_COL = 38;
/** Wider column for 12-hour times ("11:30 AM"); the rail shifts right by the difference. */
const TIME_COL_12H = 56;
const MARKER_COL = 9;
const COL_GAP = 10;
/** Centre of the marker column, where the rail runs. */
const RAIL_X = TIME_COL + COL_GAP + MARKER_COL / 2 - 0.5;
/** Card top padding + half a time line: where the start time, its dot and the card title share a line. */
const MARK_Y = 13;
/**
 * The time column grows with larger text (iOS Text Size or Settings > Font Size) so "16:00" isn't
 * cut to "16:…"; at the default size it stays TIME_COL and the rail sits exactly where it was.
 */
function useTimeCol() {
  const scale = useWindowDimensions().fontScale * (Typography.body / 13);
  const width = Math.ceil((uses12hTime() ? TIME_COL_12H : TIME_COL) * Math.max(1, scale));
  return { width, railX: RAIL_X + width - TIME_COL };
}

/** Room between the rail markers and the cards. */
const CARD_GAP = 4;

interface RowHandlers {
  selectMode: boolean;
  selectedIds: string[];
  onToggleComplete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  /** Deletes this occurrence and the later ones of its repeating series. */
  onDeleteSeries: (id: string) => void;
}

interface Props extends Omit<RowHandlers, 'onDeleteSeries'> {
  feed: HomeFeed;
  nowMs: number;
  emptyText: string;
  /** The Live-Activity task counting down to its start (from findLiveActivityPlan), shown with a ticking "starts in m:ss". */
  countdownPlanId: string | null;
  onReorder: (orderedIds: string[]) => void;
  /** Edit / Done for multi-select, in the box's header where the day count used to be (user, 2026-10-23). */
  onToggleEdit: () => void;
}

/** The running plan's marker: start dot, a line filling to `pct`, and the pulsing Now dot, in the plan's colour, riding it. */
function LiveMarker({ color, pct }: { color: string; pct: `${number}%` }) {
  const k = useHomeTokens();
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    // Sonar ripple: a ring grows out of the Now dot and fades, over and over.
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  return (
    <>
      <View style={[styles.dot9, styles.markerTop, { backgroundColor: color }]} />
      <View style={styles.liveTrack}>
        <View style={[styles.liveLine, { backgroundColor: color, height: pct }]} />
        {!reduceMotion && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.nowDot,
              styles.nowRipple,
              { top: pct, backgroundColor: color },
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
              },
            ]}
          />
        )}
        <View style={[styles.nowDot, { top: pct, backgroundColor: color, borderColor: k.sheet, shadowColor: color }]} />
      </View>
    </>
  );
}

/** How far through the running plan we are — a range by its times (full once overtime), a due point reminder by its 15-minute window. */
function livePct(plan: Plan, nowMs: number): `${number}%` {
  const progress = plan.endTime ? liveProgress(plan, nowMs).progress : dueProgress(plan, nowMs).progress;
  return `${progress * 100}%`;
}

function TimelineRow({
  plan,
  live,
  missed,
  nowMs,
  countdown,
  canCheck,
  isActive,
  drag,
  h,
}: {
  plan: Plan;
  live: boolean;
  /** Left undone past its live window today: stated plainly, like Earlier's missed rows. */
  missed: boolean;
  nowMs: number;
  /** A ticking "starts in m:ss" for the Live-Activity task. */
  countdown: string | null;
  /** Plans on a later day can't be checked off yet (same rule as Upcoming). */
  canCheck: boolean;
  isActive: boolean;
  drag: () => void;
  h: RowHandlers;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  const timeCol = useTimeCol();
  const danger = useTheme().danger;
  const color = plan.color;
  const done = plan.completed;
  const selected = h.selectedIds.includes(plan.id);
  const icon = resolvePlanIcon(plan);
  const p = planPalette(color, k.dark);
  const range = !!plan.endTime && !plan.allDay;

  // Checking a task off fades the card down and draws a strike through the title left to right;
  // unchecking undoes both quicker (user, 2026-10-22).
  const reduceMotion = useReducedMotion();
  const dimmed = done && !h.selectMode;
  const cardOpacity = useSharedValue(dimmed ? 0.6 : 1);
  const strike = useSharedValue(done ? 1 : 0);
  const titleW = useSharedValue(0);
  useEffect(() => {
    const to = dimmed ? 0.6 : 1;
    cardOpacity.value = reduceMotion ? to : withTiming(to, { duration: dimmed ? 500 : 260, easing: REasing.out(REasing.cubic) });
  }, [dimmed, reduceMotion, cardOpacity]);
  useEffect(() => {
    const to = done ? 1 : 0;
    strike.value = reduceMotion ? to : withTiming(to, { duration: done ? 450 : 200, easing: REasing.out(REasing.cubic) });
  }, [done, reduceMotion, strike]);
  const cardFade = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));
  const strikeDraw = useAnimatedStyle(() => ({ width: strike.value * titleW.value }));

  // Sub line: times normally; the live plan's countdown; a Live-Activity task's "starts in".
  let sub: React.ReactNode;
  let subColor: string = k.ink50;
  if (live && !plan.endTime) {
    subColor = k.azure;
    sub = <Text style={[t.cardSubStrong, { color: k.azure }]}>{tr('home.dueAt', { time: fmtTime(plan.time) })}</Text>;
  } else if (live) {
    const { secondsLeft } = liveProgress(plan, nowMs);
    if (secondsLeft < 0) {
      // Overtime reads calmly in minutes, grey, until the range counts as missed an hour past its
      // end (critique, 2026-10-28: a red per-second "+6:11:26" nagged all evening).
      sub = (
        <>
          {tr('home.over.pre')}
          <Text style={[t.cardSubStrong, { color: k.ink60 }]}>{formatDuration(Math.max(1, Math.floor(-secondsLeft / 60)))}</Text>
          {tr('home.over.post')}
        </>
      );
    } else {
      subColor = k.azure;
      sub = (
        <>
          {tr('home.remaining.pre')}
          <Text style={[t.cardSubStrong, { color: k.azure }]}>{formatLiveCountdown(secondsLeft)}</Text>
          {tr('home.remaining.post')}
        </>
      );
    }
  } else if (missed) {
    subColor = k.rose;
    sub = <Text style={[t.cardSub, { color: k.rose }]}>{tr('home.missedAt', { time: plan.endTime ? fmtTimeRange(plan.time, plan.endTime) : fmtTime(plan.time) })}</Text>;
  } else if (countdown) {
    subColor = k.azure;
    sub = <Text style={[t.cardSubStrong, { color: k.azure }]}>{countdown}</Text>;
  } else if (plan.allDay) {
    sub = tr('home.allDay');
  } else {
    sub = plan.endTime ? fmtTimeRange(plan.time, plan.endTime) : fmtTime(plan.time);
  }

  function toggle() {
    if (h.selectMode) return h.onToggleSelect(plan.id);
    if (done) Haptics.selectionAsync();
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    h.onToggleComplete(plan.id);
  }

  const checkOn = h.selectMode ? selected : done;
  const checkFill = h.selectMode ? k.azure : k.green;
  const showCheck = h.selectMode || canCheck;

  const body = (
    <View style={styles.row}>
      <View style={[styles.timeCol, { width: timeCol.width }, (range || live) && styles.timeColRange]}>
        <Text numberOfLines={1} style={[styles.timeRight, plan.allDay ? t.endTime : t.railTime, { color: plan.allDay ? k.ink50 : k.ink }]}>
          {plan.allDay ? tr('home.allDay') : fmtTime(plan.time, { compact: true })}
        </Text>
        {range && (
          <Text numberOfLines={1} style={[styles.timeRight, t.endTime, { color: k.ink50 }]}>
            {fmtTime(plan.endTime!, { compact: true })}
          </Text>
        )}
      </View>
      <View style={styles.markerCol}>
        {live ? (
          <LiveMarker color={p.base} pct={livePct(plan, nowMs)} />
        ) : done ? (
          <Reanimated.View entering={reduceMotion ? undefined : FadeIn.duration(700)} style={[styles.dot9, styles.markerTop, { backgroundColor: k.green }]} />
        ) : range ? (
          <View style={[styles.bar, { backgroundColor: p.barTint, borderColor: p.base }]} />
        ) : (
          <View style={[styles.dot9, styles.markerTop, styles.ringDot, { borderColor: p.base, backgroundColor: k.sheet }]} />
        )}
      </View>

      <Reanimated.View
        style={[
          styles.card,
          { backgroundColor: k.sheet, borderColor: h.selectMode && selected ? k.azure : 'transparent' },
          cardFade,
        ]}>
        {/* A flat wash of the plan's colour; the Today box already carries the border and shadow (critique, 2026-10-28). */}
        <View pointerEvents="none" style={[styles.cardTint, { backgroundColor: `${color}${k.dark ? '26' : '14'}` }]} />
        {icon && (
          <View style={[styles.iconChip, { backgroundColor: `${color}1F` }]}>
            <PlanIcon id={icon} size={17} color={color} strokeWidth={1.9} />
          </View>
        )}
        <View style={styles.cardText}>
          <View style={styles.titleWrap}>
            <Text
              numberOfLines={1}
              onTextLayout={(e) => (titleW.value = e.nativeEvent.lines[0]?.width ?? 0)}
              style={[t.cardTitle, { color: k.ink }]}>
              {plan.name}
            </Text>
            <Reanimated.View pointerEvents="none" style={[styles.strike, { backgroundColor: k.ink }, strikeDraw]} />
          </View>
          <View style={styles.subRow}>
            <ClockIcon size={11} color={subColor} strokeWidth={2} />
            <Text numberOfLines={1} style={[t.cardSub, styles.subText, { color: k.ink50 }]}>
              {sub}
            </Text>
          </View>
        </View>
        {showCheck && (
          <>
            {/* Tinted from the plan so it shows on the wash in both themes. */}
            <View style={[styles.divider, { backgroundColor: `${color}${k.dark ? '40' : '33'}` }]} />
            <BorderlessButton
              onPress={toggle}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              style={[styles.check, { backgroundColor: checkOn ? checkFill : k.sheet, borderColor: checkOn ? checkFill : k.checkEdge }]}>
              {checkOn && (
                <Reanimated.View entering={ZoomIn.springify().damping(12).stiffness(260)}>
                  <CheckIcon size={13} color="#fff" strokeWidth={3} />
                </Reanimated.View>
              )}
            </BorderlessButton>
          </>
        )}
      </Reanimated.View>
    </View>
  );

  const pressable = (
    <RectButton
      onPress={() => (h.selectMode ? h.onToggleSelect(plan.id) : h.onOpen(plan.id))}
      onLongPress={drag}
      style={{ backgroundColor: isActive ? k.sheet : 'transparent' }}
      underlayColor="transparent"
      activeOpacity={0.7}>
      {body}
    </RectButton>
  );

  function confirmDelete() {
    confirmPlanDelete(
      usePlannerStore.getState().plans,
      plan,
      () => h.onDelete(plan.id),
      () => h.onDeleteSeries(plan.id)
    );
  }

  return (
    <View style={isActive && styles.dragging}>
      {h.selectMode ? (
        pressable
      ) : (
        <Swipeable
          renderRightActions={() => (
            <Pressable onPress={confirmDelete} style={[styles.deleteAction, { backgroundColor: danger }]}>
              <TrashIcon size={18} color="#fff" strokeWidth={2} />
            </Pressable>
          )}
          overshootRight={false}
          rightThreshold={40}>
          {pressable}
        </Swipeable>
      )}
    </View>
  );
}

/**
 * One-time tip under the day's plans: swipe to delete, hold and drag to reorder (critique,
 * 2026-10-28). Gone for good once closed, or once the user deletes or reorders a plan here.
 */
function GestureHint({ onClose }: { onClose: () => void }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const reduceMotion = useReducedMotion();
  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeIn.duration(260)}
      exiting={reduceMotion ? undefined : FadeOut.duration(180)}
      style={[styles.hint, { backgroundColor: k.azureTint }]}>
      <Text style={[t.cardSub, styles.hintText, { color: k.azureDark }]}>{tr('home.gestureHint')}</Text>
      <BorderlessButton onPress={onClose} hitSlop={12} accessibilityLabel={tr('home.gestureHintClose')} style={styles.hintClose}>
        <XIcon size={12} color={k.azureDark} strokeWidth={2.4} />
      </BorderlessButton>
    </Reanimated.View>
  );
}

/** "Fri 16 May" (Thai: "ศ. 16 ต.ค.") — the title for a day that isn't today or tomorrow. */
export function shortDayTitle(d: Date) {
  return lang() === 'th' ? fmtDate(d, { weekday: 'short' }) : `${weekdayShort(d.getDay())} ${d.getDate()} ${monthShort(d.getMonth())}`;
}

export function DayTimeline({ feed, nowMs, emptyText, countdownPlanId, onReorder, onToggleEdit, ...h }: Props) {
  const k = useHomeTokens();
  const timeCol = useTimeCol();
  const t = useHomeType();
  const hintSeen = usePlannerStore((s) => s.homeGestureHintSeen);
  const dismissHint = usePlannerStore((s) => s.dismissHomeGestureHint);
  const deletePlanSeries = usePlannerStore((s) => s.deletePlanSeries);
  const { day, live, dayISO, isToday } = feed;
  // Using either gesture counts as having learned it.
  const rowHandlers = {
    ...h,
    onDelete: (id: string) => {
      dismissHint();
      h.onDelete(id);
    },
    onDeleteSeries: (id: string) => {
      dismissHint();
      deletePlanSeries(id);
    },
  };
  const date = fromISO(dayISO);
  const tomorrow = new Date(nowMs);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = dayISO === toISO(tomorrow);
  const todayISO = toISO(new Date(nowMs));

  const title = isToday ? tr('home.today') : isTomorrow ? tr('home.tomorrow') : shortDayTitle(date);
  // Today's date is already under the greeting, so its pill is just "Today" (critique, 2026-10-28).
  const dateLine = isTomorrow ? fmtDate(date, { weekday: 'short' }, 'dm') : null;

  function countdownFor(plan: Plan): string | null {
    if (plan.id !== countdownPlanId) return null;
    // A far-off m:ss countdown read like a clock time (critique, 2026-10-28), so it only ticks in the last 10 minutes.
    return formatStartsIn(planDateTime(plan).getTime() - nowMs);
  }

  return (
    <View>
      <View style={styles.head}>
        {/* Day label in an azure pill, sized like the Upcoming / Earlier headings (user, 2026-10-23). */}
        <View style={[styles.titlePill, { backgroundColor: k.azure }]}>
          <Text numberOfLines={1} style={[t.blockTitle, { color: '#fff' }]}>
            {title}
            {dateLine && <Text style={[t.blockTitleDate, styles.pillDate]}>{` · ${dateLine}`}</Text>}
          </Text>
        </View>
        <View style={styles.title} />
        <Pressable onPress={onToggleEdit} hitSlop={10}>
          <Text style={[t.blockLink, { color: k.azureDark }]}>{h.selectMode ? tr('common.done') : tr('home.edit')}</Text>
        </Pressable>
      </View>

      {day.length === 0 ? (
        <Text style={[t.cardSub, styles.empty, { color: k.ink50 }]}>{emptyText}</Text>
      ) : (
        <View>
          <View pointerEvents="none" style={[styles.railLine, { left: timeCol.railX, backgroundColor: k.rail }]} />
          <NestableDraggableFlatList
          data={day}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => {
            dismissHint();
            onReorder(data.map((p) => p.id));
          }}
          onPlaceholderIndexChange={() => Haptics.selectionAsync()}
          renderItem={({ item, drag, isActive }) => (
            <TimelineRow
              plan={item}
              live={live?.id === item.id}
              missed={isToday && isMissedToday(item, nowMs)}
              nowMs={nowMs}
              countdown={countdownFor(item)}
              canCheck={dayISO <= todayISO}
              isActive={isActive}
              drag={drag}
              h={rowHandlers}
            />
          )}
          />
        </View>
      )}
      {!hintSeen && day.length > 0 && !h.selectMode && <GestureHint onClose={dismissHint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10 },
  titlePill: { flexShrink: 1, paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999 },
  pillDate: { color: 'rgba(255,255,255,0.8)' },
  title: { flex: 1, minWidth: 0 },
  empty: { paddingVertical: 12 },

  // Row top padding + the card's bottom margin give 10pt between cards (rows are clipped by Swipeable).
  row: { flexDirection: 'row', gap: COL_GAP, paddingTop: 6 },
  railLine: { position: 'absolute', top: 20, bottom: 14, width: 1 },
  // Old Home rail (design_handoff_tickle_home_7), but times left-aligned on the screen's shared left edge (user, 2026-10-19); a range's end time sits at the card's bottom.
  timeCol: { width: TIME_COL, paddingTop: 7, marginBottom: 4 },
  timeColRange: { justifyContent: 'space-between', paddingBottom: 7 },
  timeRight: { textAlign: 'left' },
  markerCol: { width: MARKER_COL, marginBottom: 4 },
  dot9: { width: 9, height: 9, borderRadius: 4.5 },
  markerTop: { marginTop: MARK_Y - 4.5 },
  ringDot: { borderWidth: 2 },
  bar: { position: 'absolute', left: 2, top: MARK_Y - 4.5, bottom: 9, width: 5, borderRadius: 3, borderWidth: 1.5 },
  liveTrack: { position: 'absolute', left: 0, right: 0, top: MARK_Y + 4.5, bottom: 10 },
  liveLine: { position: 'absolute', left: 4, top: 0, width: 1 },
  // 14pt dot centred on the 1pt live line, ringed in the sheet colour, with a ripple of the same size behind it.
  nowDot: {
    position: 'absolute',
    left: -2.5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    marginTop: -7,
    shadowOpacity: 0.6,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  nowRipple: { borderWidth: 0, shadowOpacity: 0 },

  card: {
    flex: 1,
    minWidth: 0,
    marginLeft: CARD_GAP,
    marginBottom: 4,
    borderRadius: 16,
    // Transparent until selected in Edit mode, so selecting doesn't shift the row.
    borderWidth: 1.5,
    paddingVertical: 9.5,
    paddingLeft: 8.5,
    paddingRight: 11.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  /** The strike line's width comes from the title's measured line, so it spans only the text. */
  titleWrap: { justifyContent: 'center' },
  strike: { position: 'absolute', left: 0, height: 1.5, borderRadius: 1, top: '52%' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { flexShrink: 1 },
  cardTint: { ...StyleSheet.absoluteFillObject, borderRadius: 14.5 },
  iconChip: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: -2 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 12 },
  hintText: { flex: 1, minWidth: 0 },
  hintClose: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },

  deleteAction: { width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginLeft: 6, marginTop: 6, marginBottom: 4 },
  dragging: {
    shadowColor: '#10203A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    transform: [{ scale: 1.02 }],
  },
});
