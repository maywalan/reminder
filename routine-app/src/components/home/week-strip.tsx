import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { Text } from '@/components/text';
import { t as tr } from '@/i18n';
import { displayYear, monthShort, weekdayLetter } from '@/i18n/format';
import { toISO } from '@/utils/dates';

/**
 * Home's week strip (design_handoff_tickle_home_timeline, screen 1): a "Week 20 / 12–18 May"
 * header between ‹ › buttons, a "Today" chip whenever another week is showing, and a Sun–Sat row (user, 2026-10-25, matching Calendar)
 * of days: weekday letter over a bold date, the selected day in a filled azure circle and a dot
 * under days that have plans (user, 2026-10-21). A horizontal swipe on the day row also steps the week.
 */

/** Sunday of the week `d` is in, at local midnight. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Sunday-start week number for the Sun–Sat week starting `sunday`: week 1 is the week holding 1 Jan of its Saturday's year. */
export function weekNumber(sunday: Date): number {
  const sat = addDays(sunday, 6);
  const jan1 = new Date(sat.getFullYear(), 0, 1);
  const week1 = Date.UTC(jan1.getFullYear(), 0, 1 - jan1.getDay());
  return 1 + Math.round((Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()) - week1) / (7 * 864e5));
}

/** "12–18 May", or "28 Apr – 4 May" across a month boundary. */
function weekRange(d0: Date, d6: Date) {
  return d0.getMonth() === d6.getMonth()
    ? `${d0.getDate()}–${d6.getDate()} ${monthShort(d0.getMonth())}`
    : `${d0.getDate()} ${monthShort(d0.getMonth())} – ${d6.getDate()} ${monthShort(d6.getMonth())}`;
}

function Chevron({ dir, color }: { dir: 'left' | 'right'; color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface Props {
  /** Sunday of the visible week. */
  weekStart: Date;
  /** 0 = the current week. */
  weekOffset: number;
  selectedISO: string;
  todayISO: string;
  /** Days (ISO) that get a dot because they have at least one plan. */
  markedISOs: Set<string>;
  onStep: (delta: -1 | 1) => void;
  onToday: () => void;
  onSelect: (iso: string) => void;
  /** Inside the Today box with the day's timeline (user's reference, 2026-10-22): no page inset or pull-up. */
  embedded?: boolean;
}

/**
 * Left/right inset shared by Home's search row, the week strip and everything inside the feed
 * sheet, so the whole screen lines up on one edge with room on both sides (user, 2026-10-19).
 */
export const FEED_INSET = 20;

export function WeekStrip({ weekStart, weekOffset, selectedISO, todayISO, markedISOs, onStep, onToday, onSelect, embedded }: Props) {
  const k = useHomeTokens();
  const t = useHomeType();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const d0 = days[0];
  const d6 = days[6];
  const thisYear = new Date().getFullYear();
  const weekNo = weekNumber(d0) + (d0.getFullYear() !== thisYear || d6.getFullYear() !== thisYear ? ` · ${displayYear(d6.getFullYear())}` : '');

  const step = (delta: -1 | 1) => {
    Haptics.selectionAsync();
    onStep(delta);
  };

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .onEnd((e) => {
      if (e.translationX < -50 || e.velocityX < -600) step(1);
      else if (e.translationX > 50 || e.velocityX > 600) step(-1);
    });

  return (
    <View style={embedded && styles.embedded}>
      <View style={[styles.head, embedded && styles.headEmbedded]}>
        <BouncyPressable pressedScale={0.92} onPress={() => step(-1)} hitSlop={9} accessibilityLabel={tr('home.prevWeek')} style={styles.nav}>
          <Chevron dir="left" color={k.ink} />
        </BouncyPressable>
        <View style={styles.centre}>
          <View style={styles.centreText}>
            <Text numberOfLines={1} style={[t.weekNo, { color: k.ink, flexShrink: 0 }]}>
              {weekOffset === 0 ? tr('home.thisWeek') : tr('home.week', { n: weekNo })}
            </Text>
            {/* The current week is just "This week", no range (user, 2026-10-23). */}
            {weekOffset !== 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: k.railFuture }]} />
                <Text numberOfLines={1} style={[t.weekRange, { color: k.ink50 }]}>
                  {weekRange(d0, d6)}
                </Text>
              </>
            )}
          </View>
          {weekOffset !== 0 && (
            <Reanimated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
              <BouncyPressable pressedScale={0.95} onPress={onToday} accessibilityLabel={tr('home.backToToday')} style={[styles.todayChip, { backgroundColor: k.azureTint }]}>
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                  <Path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" stroke={k.azure} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={[t.chip, { color: k.azureDark }]}>{tr('home.today')}</Text>
              </BouncyPressable>
            </Reanimated.View>
          )}
        </View>
        <BouncyPressable pressedScale={0.92} onPress={() => step(1)} hitSlop={9} accessibilityLabel={tr('home.nextWeek')} style={styles.nav}>
          <Chevron dir="right" color={k.ink} />
        </BouncyPressable>
      </View>

      <GestureDetector gesture={swipe}>
        {/* No slide when the week changes; the new days just swap in (user, 2026-10-23). */}
        <View style={[styles.row, embedded && styles.rowEmbedded]}>
          {days.map((d) => {
            const iso = toISO(d);
            const sel = iso === selectedISO;
            const today = iso === todayISO;
            // Only today is azure, ringed when another day is picked; weekends read lighter so they
            // can't be mistaken for it (critique, 2026-10-28 — replaces azure weekends from 2026-10-25).
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const numFg = sel ? '#fff' : today ? k.azure : weekend ? k.ink50 : k.ink;
            return (
              <BouncyPressable
                key={iso}
                pressedScale={0.9}
                onPress={() => {
                  if (!sel) Haptics.selectionAsync();
                  onSelect(iso);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={styles.cell}>
                <Text numberOfLines={1} style={[t.dayCap, { color: k.ink45 }]}>
                  {weekdayLetter(d.getDay())}
                </Text>
                <View style={styles.numWrap}>
                  {sel && <View style={[styles.circle, { backgroundColor: k.azure }]} />}
                  {today && !sel && <View style={[styles.circle, styles.todayRing, { borderColor: k.azure }]} />}
                  <Text style={[t.dayNum, { color: numFg }]}>{d.getDate()}</Text>
                </View>
                <View style={[styles.dot, { backgroundColor: markedISOs.has(iso) ? k.dayDot : 'transparent' }]} />
              </BouncyPressable>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pulled up into the search row's 14pt bottom padding (search row itself left as is) — user, 2026-10-19.
  head: { marginTop: -7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: FEED_INSET, paddingBottom: 6 },
  // Bare chevrons, no circle (user, 2026-10-22); hitSlop grows the 26pt box to a 44pt target.
  nav: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  centre: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 },
  // Week number and date range on one line (user, 2026-10-18).
  centreText: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  divider: { width: 1.5, height: 14, borderRadius: 1 },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11 },
  // Days stretch to the search row's full width (user, 2026-10-19).
  row: { flexDirection: 'row', paddingHorizontal: FEED_INSET },
  embedded: { marginBottom: 16 },
  headEmbedded: { marginTop: 0, paddingHorizontal: 0, paddingBottom: 8 },
  rowEmbedded: { paddingHorizontal: 0 },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  numWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  circle: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  todayRing: { borderWidth: 1.5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
