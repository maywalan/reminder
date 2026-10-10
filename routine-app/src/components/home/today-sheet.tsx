import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type ReactNode } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { BorderlessButton, RectButton, Swipeable } from 'react-native-gesture-handler';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import { useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { CheckIcon, TrashIcon } from '@/components/icon';
import { planPalette, useHomeTokens, useHomeType, type HomeTokens } from '@/components/home/tokens';
import { useTheme } from '@/hooks/use-theme';
import type { Group, Plan } from '@/store/types';
import { planDateTime } from '@/utils/countdown';
import { pad } from '@/utils/dates';
import { t as tr } from '@/i18n';
import { fmtDate } from '@/i18n/format';
import {
  dueProgress,
  durationMinutes,
  formatDuration,
  formatLiveCountdown,
  freeMinutesBetween,
  FREE_GAP_MIN,
  liveProgress,
  type HomeFeed,
} from '@/utils/home-feed';

/**
 * The raised white "Today" sheet from design_handoff_tickle_home_7 — a vertical time rail of
 * today's open and live tasks. Every row shares one grid: 38pt time column, 9pt rail marker,
 * content, 10pt gaps, so the markers all sit on the rail line at x = 52.
 */

const TIME_COL = 38;
const MARKER_COL = 9;
const COL_GAP = 10;
const RAIL_X = 52;

interface RowHandlers {
  selectMode: boolean;
  selectedIds: string[];
  onToggleComplete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExtend: (plan: Plan) => void;
}

interface Props extends RowHandlers {
  feed: HomeFeed;
  nowMs: number;
  groups: Group[];
  emptyText: string;
  /** The Live-Activity task counting down to its start (from findLiveActivityPlan), shown with a ticking "starts in m:ss". */
  countdownPlanId: string | null;
  onReorder: (orderedIds: string[]) => void;
}

function Grid({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

function MetaLine({
  group,
  detail,
  palette,
  strongDetail,
  t,
  k,
}: {
  group?: Group;
  detail: string;
  palette: string;
  /** Render the detail in the plan colour at 600 — used for the live countdown. */
  strongDetail?: boolean;
  t: ReturnType<typeof useHomeType>;
  k: HomeTokens;
}) {
  return (
    <Text numberOfLines={1} style={[t.meta, { color: k.ink50 }]}>
      {group && <Text style={[t.metaStrong, { color: palette }]}>{group.name}</Text>}
      {group && detail ? ' · ' : ''}
      {strongDetail ? <Text style={[t.metaStrong, { color: palette }]}>{detail}</Text> : detail}
    </Text>
  );
}

/** "Mon, 5 Oct" */
function dateLine(d: Date) {
  return fmtDate(d, { weekday: 'short' }, 'dm');
}

/** The idle Now marker: an azure "Now" badge (time under it) in the time column, the azure dot on the rail, and the Now line running off to the right. */
function NowRow({ nowMs }: { nowMs: number }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const d = new Date(nowMs);
  return (
    <Grid style={styles.nowRow}>
      <View style={[styles.timeColBox, styles.nowBadgeCol]}>
        <View style={[styles.nowBadge, { backgroundColor: k.primary }]}>
          <Text style={[t.metaStrong, styles.nowBadgeLabel]}>{tr('home.nowBadge')}</Text>
          <Text style={[t.nowTime, styles.nowBadgeTime]}>{`${pad(d.getHours())}:${pad(d.getMinutes())}`}</Text>
        </View>
      </View>
      <View style={[styles.dot9, { backgroundColor: k.primary }]} />
      <View style={[styles.nowLine, { backgroundColor: k.nowLine }]} />
    </Grid>
  );
}

function GapRow({ minutes }: { minutes: number }) {
  const k = useHomeTokens();
  const t = useHomeType();
  return (
    <Grid style={styles.gapRow}>
      <View style={styles.timeColBox} />
      <View style={styles.markerCol} />
      <Text style={[t.endTime, { color: k.ink40 }]}>{tr('home.free', { duration: formatDuration(minutes, { dropMinutesAfterHours: true }) })}</Text>
    </Grid>
  );
}

/** 22pt check ring (or, in Edit mode, the selection ring). `fill` is owned by the row so completing can fill the ring, then fade the row. */
function CheckRing({ fill, color, selectMode, selected, onPress }: { fill: Animated.Value; color: string; selectMode: boolean; selected: boolean; onPress: () => void }) {
  const k = useHomeTokens();
  const theme = useTheme();
  useEffect(() => {
    fill.setValue(selectMode && selected ? 1 : 0);
  }, [selectMode, selected, fill]);

  return (
    <BorderlessButton onPress={onPress} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }} style={[styles.ring, { borderColor: k.checkRing }]}>
      <Animated.View
        style={[
          styles.ringFill,
          {
            backgroundColor: selectMode ? theme.accent : color,
            opacity: fill,
            transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}>
        <CheckIcon size={12} color="#fff" strokeWidth={3} />
      </Animated.View>
    </BorderlessButton>
  );
}

function TaskRow({
  plan,
  group,
  soon,
  isActive,
  drag,
  h,
}: {
  plan: Plan;
  group?: Group;
  /** Replaces the usual detail: "in 12 min", or a Live-Activity task's ticking "starts in 11:48". */
  soon: { text: string; live: boolean } | null;
  isActive: boolean;
  drag: () => void;
  h: RowHandlers;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  const p = planPalette(plan.color, k.dark);
  const selected = h.selectedIds.includes(plan.id);
  const range = !!plan.endTime && !plan.allDay;
  const dur = durationMinutes(plan);

  const danger = useTheme().danger;
  const leave = useRef(new Animated.Value(1)).current;
  const ringFill = useRef(new Animated.Value(0)).current;

  function complete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(ringFill, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(leave, { toValue: 0, duration: 220, delay: 120, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => h.onToggleComplete(plan.id));
  }

  let detail: string;
  if (soon) detail = soon.text;
  else if (plan.allDay) detail = tr('home.allDayLower');
  else if (range) detail = formatDuration(dur);
  else if (plan.alerts.length > 0) detail = tr('home.alerts', { count: plan.alerts.length });
  else detail = tr('home.reminder');

  // Rows grow a little with length (54 at ≤1 hr, 72 at ≥2 hr) but aren't scaled to real time.
  const rangeMin = range ? 54 + 18 * Math.min(1, Math.max(0, (dur - 60) / 60)) : 0;

  const ring = (
    <CheckRing
      fill={ringFill}
      color={p.base}
      selectMode={h.selectMode}
      selected={selected}
      onPress={() => (h.selectMode ? h.onToggleSelect(plan.id) : complete())}
    />
  );

  const body = (
    <Grid style={range ? [styles.rangeRow, { minHeight: rangeMin + 16 }] : styles.pointRow}>
      {range ? (
        <View style={[styles.timeColBox, styles.rangeTimes]}>
          <Text style={[styles.timeRight, t.railTime, { color: k.ink }]}>{plan.time}</Text>
          <Text style={[styles.timeRight, t.endTime, { color: k.ink50 }]}>{plan.endTime}</Text>
        </View>
      ) : (
        <Text style={[styles.timeCol, plan.allDay ? t.endTime : t.railTime, { color: plan.allDay ? k.ink50 : k.ink }]}>
          {plan.allDay ? tr('home.allDay') : plan.time}
        </Text>
      )}
      {range ? (
        <View style={[styles.markerCol, styles.barWrap]}>
          <View style={[styles.bar, { backgroundColor: p.barTint, borderColor: p.base }]} />
        </View>
      ) : (
        <View style={[styles.dot9, styles.ringDot, { borderColor: p.base, backgroundColor: k.sheet }]} />
      )}
      {/* The Live-Activity task counting down to its start gets the live card's tint, so it's
          obvious which task the Lock Screen is counting down to. */}
      <View style={[styles.content, soon?.live && [styles.countdownCard, { backgroundColor: p.cardTint }]]}>
        <View style={styles.contentText}>
          <Text numberOfLines={1} style={[t.title, { color: k.ink }]}>
            {plan.name}
          </Text>
          <MetaLine group={group} detail={detail} palette={p.text} strongDetail={soon?.live} t={t} k={k} />
        </View>
        {ring}
      </View>
    </Grid>
  );

  const pressable = (
    <RectButton
      onPress={() => (h.selectMode ? h.onToggleSelect(plan.id) : h.onOpen(plan.id))}
      onLongPress={drag}
      style={{ backgroundColor: isActive ? k.sheet : 'transparent' }}
      underlayColor={k.rail}
      activeOpacity={1}>
      {body}
    </RectButton>
  );

  function confirmDelete() {
    Alert.alert(tr('plan.deleteTitle'), tr('plan.deleteBody', { name: plan.name }), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('common.delete'), style: 'destructive', onPress: () => h.onDelete(plan.id) },
    ]);
  }

  return (
    <Animated.View
      style={[
        { opacity: leave, transform: [{ scale: leave.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] },
        isActive && styles.dragging,
      ]}>
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
    </Animated.View>
  );
}

/**
 * The running session: tinted card with progress, countdown, +10 min and Done. A point reminder
 * uses the same card while it's due — "due" instead of "ends", a count-up since its time, the bar
 * filling over its 15-minute due window, and no +10 min.
 */
function LiveRow({ plan, group, nowMs, isActive, drag, h }: { plan: Plan; group?: Group; nowMs: number; isActive: boolean; drag: () => void; h: RowHandlers }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const reduceMotion = useReducedMotion();
  const p = planPalette(plan.color, k.dark);
  const point = !plan.endTime;
  const range = liveProgress(plan, nowMs);
  const due = dueProgress(plan, nowMs);
  const over = !point && range.secondsLeft < 0;
  const pct = `${(point ? due.progress : over ? 1 : range.progress) * 100}%` as const;
  const countdown = point ? formatLiveCountdown(-due.secondsOver) : formatLiveCountdown(range.secondsLeft);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    // Sonar ripple: a ring grows out of the Now dot and fades, over and over — motion the eye
    // catches from anywhere on the screen, unlike the old gentle opacity breathe.
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  const selected = h.selectedIds.includes(plan.id);

  return (
    <Pressable
      onPress={() => (h.selectMode ? h.onToggleSelect(plan.id) : h.onOpen(plan.id))}
      onLongPress={drag}
      style={[isActive && { backgroundColor: k.sheet }, isActive && styles.dragging]}>
      <Grid style={styles.liveRow}>
        <View style={[styles.timeColBox, styles.liveTimes]}>
          <Text style={[styles.timeRight, t.railTime, { color: k.ink }]}>{plan.time}</Text>
          {!point && <Text style={[styles.timeRight, t.endTime, { color: k.ink50 }]}>{plan.endTime}</Text>}
        </View>
        <View style={styles.markerCol}>
          <View style={[styles.dot9, styles.liveStart, { backgroundColor: p.base }]} />
          {/* The Now dot travels this track (start marker → bottom of the card), so even at 100% it
              stays beside its own card instead of sliding onto the next row. */}
          <View style={styles.liveTrack}>
            <View style={[styles.liveLine, { backgroundColor: p.base, height: pct }]} />
            {!reduceMotion && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.nowDot,
                  styles.nowRipple,
                  { top: pct, backgroundColor: k.liveDot },
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
                  },
                ]}
              />
            )}
            <View style={[styles.nowDot, { top: pct, backgroundColor: k.liveDot, borderColor: k.sheet }]} />
          </View>
        </View>
        <View
          style={[
            styles.liveCard,
            { backgroundColor: p.cardTint },
            h.selectMode && selected && { borderWidth: 1.5, borderColor: k.primary },
          ]}>
          <View style={styles.liveHead}>
            <View style={styles.liveTitleRow}>
              <Text numberOfLines={1} style={[t.title, styles.liveTitle, { color: k.ink }]}>
                {plan.name}
              </Text>
              <View style={[styles.liveBadge, { backgroundColor: over ? k.missedDot : k.liveDot }]}>
                <View style={styles.liveBadgeDot} />
                <Text style={[t.metaStrong, styles.liveBadgeText]}>{over ? tr('home.badge.overtime') : point ? tr('home.badge.dueNow') : tr('home.badge.liveNow')}</Text>
              </View>
            </View>
            <MetaLine group={group} detail={point ? tr('home.due', { time: plan.time }) : tr('home.ends', { time: plan.endTime ?? '' })} palette={p.text} t={t} k={k} />
          </View>
          <View style={[styles.track, { backgroundColor: p.track }]}>
            <View style={[styles.track, { width: pct, backgroundColor: p.base }]} />
          </View>
          <View style={styles.actions}>
            <Text numberOfLines={1} style={[t.countdown, styles.countdown, { color: over ? k.missedText : p.text }]}>
              {countdown}
            </Text>
            {!point && (
              <Pressable onPress={() => h.onExtend(plan)} hitSlop={10} disabled={h.selectMode}>
                <Text style={[t.button, { color: k.ink50 }]}>{tr('home.plus10')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                h.onToggleComplete(plan.id);
              }}
              disabled={h.selectMode}
              hitSlop={8}
              style={[styles.donePill, { borderColor: p.pillBorder, backgroundColor: k.donePillBg }]}>
              <Text style={[t.button, { color: p.pillText }]}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Grid>
    </Pressable>
  );
}

export function TodaySheet({ feed, nowMs, groups, emptyText, countdownPlanId, onReorder, ...h }: Props) {
  const k = useHomeTokens();
  const t = useHomeType();
  const { today, live, leftCount, nowLineIndex } = feed;

  const count = live ? tr('home.count.liveLeft', { count: leftCount }) : leftCount > 0 ? tr('home.count.left', { count: leftCount }) : tr('home.count.allClear');

  // A Live-Activity task gets a ticking "starts in m:ss" through its last hour (mirroring the Lock
  // Screen); otherwise the next task gets a quieter "in N min" when it's within the hour.
  const next = nowLineIndex !== null ? today[nowLineIndex] : undefined;
  function soonFor(plan: Plan): { text: string; live: boolean } | null {
    const untilMs = planDateTime(plan).getTime() - nowMs;
    if (plan.id === countdownPlanId) {
      return { text: untilMs > 0 ? tr('home.startsIn', { time: formatLiveCountdown(Math.ceil(untilMs / 1000)) }) : tr('home.now'), live: true };
    }
    if (plan.id !== next?.id || plan.allDay) return null;
    const min = Math.ceil(untilMs / 60000);
    return min > 0 && min <= 60 ? { text: tr('home.inMin', { min }), live: false } : null;
  }

  return (
    <View style={[styles.sheet, { backgroundColor: k.sheet, borderColor: k.sheetBorder }]}>
      <View style={styles.sheetHead}>
        <Text numberOfLines={1} style={[t.todayHeading, styles.sheetTitle, { color: k.primary }]}>
          {tr('home.today')}
          <Text style={[t.todayDate, { color: k.ink50 }]}>{`  ·  ${dateLine(new Date(nowMs))}`}</Text>
        </Text>
        <Text numberOfLines={1} style={[t.meta, { color: k.ink50 }]}>
          {count}
        </Text>
      </View>

      {today.length === 0 ? (
        <Text style={[t.meta, styles.empty, { color: k.ink50 }]}>{emptyText}</Text>
      ) : (
        <View style={styles.list}>
          <View pointerEvents="none" style={[styles.railLine, { backgroundColor: k.rail }]} />
          <NestableDraggableFlatList
            data={today}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => onReorder(data.map((p) => p.id))}
            onPlaceholderIndexChange={() => Haptics.selectionAsync()}
            renderItem={({ item, drag, isActive, getIndex }) => {
              const i = getIndex() ?? 0;
              const gap = freeMinutesBetween(today[i - 1], item);
              const group = groups.find((g) => g.id === item.groupId);
              return (
                <View>
                  {nowLineIndex === i && <NowRow nowMs={nowMs} />}
                  {!isActive && gap >= FREE_GAP_MIN && nowLineIndex !== i && <GapRow minutes={gap} />}
                  {live?.id === item.id ? (
                    <LiveRow plan={item} group={group} nowMs={nowMs} isActive={isActive} drag={drag} h={h} />
                  ) : (
                    <TaskRow
                      plan={item}
                      group={group}
                      soon={soonFor(item)}
                      isActive={isActive}
                      drag={drag}
                      h={h}
                    />
                  )}
                </View>
              );
            }}
          />
          {nowLineIndex === today.length && <NowRow nowMs={nowMs} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
    shadowColor: '#10203A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sheetTitle: { flexShrink: 1 },
  sheetHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingLeft: 10, paddingRight: 4 },
  empty: { paddingHorizontal: 10, paddingVertical: 14 },
  list: { paddingRight: 4, paddingVertical: 4 },
  railLine: { position: 'absolute', left: RAIL_X, top: 14, bottom: 14, width: 1 },

  grid: { flexDirection: 'row', gap: COL_GAP },
  timeColBox: { width: TIME_COL },
  timeCol: { width: TIME_COL, textAlign: 'right' },
  timeRight: { textAlign: 'right' },
  markerCol: { width: MARKER_COL },
  content: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  contentText: { flex: 1, minWidth: 0 },
  countdownCard: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13, marginVertical: -4 },

  pointRow: { alignItems: 'center', paddingVertical: 10 },
  dot9: { width: 9, height: 9, borderRadius: 4.5 },
  ringDot: { borderWidth: 2 },

  rangeRow: { alignItems: 'stretch', paddingVertical: 8 },
  rangeTimes: { justifyContent: 'space-between', paddingVertical: 2 },
  barWrap: { alignItems: 'center' },
  bar: { flex: 1, width: 5, borderRadius: 3, borderWidth: 1.5 },

  gapRow: { alignItems: 'center', paddingVertical: 2 },
  nowRow: { alignItems: 'center', paddingVertical: 6 },
  // Exactly the time column's width — the draggable list clips anything wider. Rail times are
  // right-aligned and ~31pt wide, so nudging the badge 3.5pt right centres it over them, with an
  // even overhang on both sides.
  nowBadgeCol: { alignItems: 'stretch' },
  nowBadge: {
    transform: [{ translateX: 3.5 }],
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#1B76E8',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  nowBadgeLabel: { color: '#fff', fontSize: 12, lineHeight: 14 },
  nowBadgeTime: { color: 'rgba(255,255,255,0.85)', lineHeight: 12 },
  nowLine: { flex: 1, height: 1 },

  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, overflow: 'hidden' },
  ringFill: { position: 'absolute', top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  liveRow: { alignItems: 'stretch', paddingVertical: 4 },
  liveTimes: { justifyContent: 'space-between', paddingVertical: 12 },
  liveTrack: { position: 'absolute', left: 0, right: 0, top: 20, bottom: 14 },
  liveLine: { position: 'absolute', left: 4, top: 0, width: 1 },
  liveStart: { position: 'absolute', left: 0, top: 16 },
  // 14pt dot centred on the 1pt live line (x = 4.5), ringed in the sheet colour so it lifts off
  // the coloured rail, with a ripple of the same size behind it.
  nowDot: {
    position: 'absolute',
    left: -2.5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    marginTop: -7,
    shadowColor: '#35B978',
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  nowRipple: { borderWidth: 0, shadowOpacity: 0 },
  liveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveTitle: { flexShrink: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9 },
  liveBadgeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 9.5, letterSpacing: 0.4 },
  liveCard: { flex: 1, minWidth: 0, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 13, gap: 9 },
  liveHead: { gap: 1 },
  track: { height: 3, borderRadius: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countdown: { flex: 1 },
  donePill: { height: 26, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  deleteAction: { width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginLeft: 6 },
  dragging: {
    shadowColor: '#10203A',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderRadius: 14,
    transform: [{ scale: 1.02 }],
  },
});
