import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { FadeIn, FadeInLeft, FadeInRight, FadeOut } from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { Text } from '@/components/text';
import { t as tr } from '@/i18n';
import { displayYear, monthShort, weekdayShort } from '@/i18n/format';
import { toISO } from '@/utils/dates';

/**
 * Home's week strip (design_handoff_tickle_home_timeline, screen 1): a "Week 20 / 12–18 May"
 * header between ‹ › buttons, a "Today" chip whenever another week is showing, and a Mon–Sun row
 * of day cells. A horizontal swipe on the day row also steps the week.
 */

/** Monday of the ISO week `d` is in, at local midnight. */
export function startOfISOWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** ISO-8601 week number (Monday start; week 1 holds the year's first Thursday). Same maths as the handoff's `isoWeek`. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 3));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - y0.getTime()) / 864e5 - 3 + ((y0.getUTCDay() + 6) % 7)) / 7);
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
  /** Monday of the visible week. */
  weekStart: Date;
  /** 0 = the current week. */
  weekOffset: number;
  selectedISO: string;
  todayISO: string;
  /** -1 / +1 for the last step direction, so the new week slides in from the matching side. */
  direction: number;
  onStep: (delta: -1 | 1) => void;
  onToday: () => void;
  onSelect: (iso: string) => void;
}

/**
 * Left/right inset shared by Home's search row, the week strip and everything inside the feed
 * sheet, so the whole screen lines up on one edge with room on both sides (user, 2026-10-19).
 */
export const FEED_INSET = 20;

export function WeekStrip({ weekStart, weekOffset, selectedISO, todayISO, direction, onStep, onToday, onSelect }: Props) {
  const k = useHomeTokens();
  const t = useHomeType();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const d0 = days[0];
  const d6 = days[6];
  const thisYear = new Date().getFullYear();
  const weekNo = isoWeek(d0) + (d0.getFullYear() !== thisYear || d6.getFullYear() !== thisYear ? ` · ${displayYear(d6.getFullYear())}` : '');

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

  const entering = direction > 0 ? FadeInRight.springify().damping(18).stiffness(220) : direction < 0 ? FadeInLeft.springify().damping(18).stiffness(220) : undefined;

  return (
    <View>
      <View style={styles.head}>
        <BouncyPressable pressedScale={0.92} onPress={() => step(-1)} accessibilityLabel={tr('home.prevWeek')} style={[styles.nav, { backgroundColor: k.cell, borderColor: k.navBorder }]}>
          <Chevron dir="left" color={k.ink} />
        </BouncyPressable>
        <View style={styles.centre}>
          <View style={styles.centreText}>
            <Text numberOfLines={1} style={[t.weekNo, { color: k.ink, flexShrink: 0 }]}>
              {tr('home.week', { n: weekNo })}
            </Text>
            <View style={[styles.divider, { backgroundColor: k.railFuture }]} />
            <Text numberOfLines={1} style={[t.weekRange, { color: k.ink50 }]}>
              {weekRange(d0, d6)}
            </Text>
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
        <BouncyPressable pressedScale={0.92} onPress={() => step(1)} accessibilityLabel={tr('home.nextWeek')} style={[styles.nav, { backgroundColor: k.cell, borderColor: k.navBorder }]}>
          <Chevron dir="right" color={k.ink} />
        </BouncyPressable>
      </View>

      <GestureDetector gesture={swipe}>
        <Reanimated.View key={toISO(weekStart)} entering={entering} style={styles.row}>
          {days.map((d, i) => {
            const iso = toISO(d);
            const sel = iso === selectedISO;
            const weekend = i >= 5;
            const today = iso === todayISO;
            const capBg = sel ? k.azure : weekend ? k.weekendCap : k.cap;
            const capFg = sel ? '#fff' : weekend ? k.rose : k.ink55;
            const numFg = sel ? k.azureDark : weekend ? k.rose : today ? k.azure : k.ink;
            return (
              <BouncyPressable
                key={iso}
                pressedScale={0.95}
                onPress={() => {
                  if (!sel) Haptics.selectionAsync();
                  onSelect(iso);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[styles.cellWrap, sel ? styles.cellSelected : styles.cellShadow, { backgroundColor: sel ? k.azureTint : k.cell }]}>
                {sel && <View pointerEvents="none" style={[styles.ring, { borderColor: k.azure }]} />}
                <View style={styles.cell}>
                  <Text numberOfLines={1} style={[t.dayCap, styles.cap, { backgroundColor: capBg, color: capFg }]}>
                    {weekdayShort(d.getDay())}
                  </Text>
                  <Text style={[t.dayNum, styles.num, { color: numFg }]}>{d.getDate()}</Text>
                </View>
              </BouncyPressable>
            );
          })}
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pulled up into the search row's 14pt bottom padding (search row itself left as is) — user, 2026-10-19.
  head: { marginTop: -7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: FEED_INSET, paddingBottom: 6 },
  nav: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  centre: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 },
  // Week number and date range on one line (user, 2026-10-18).
  centreText: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  divider: { width: 1.5, height: 12, borderRadius: 1 },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11 },
  // Days stretch to the search row's full width (user, 2026-10-19).
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: FEED_INSET },
  cellWrap: { flex: 1, minWidth: 0, borderRadius: 9 },
  cellShadow: { shadowColor: '#10203A', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cellSelected: {},
  // The handoff's selected state is a 2px ring outside the cell (box-shadow 0 0 0 2px), so it
  // doesn't shrink the cap — drawn here as an outline 2pt outside the cell.
  ring: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 11, borderWidth: 2 },
  cell: { borderRadius: 9, overflow: 'hidden', alignItems: 'stretch' },
  cap: { textAlign: 'center', paddingVertical: 1.5 },
  num: { textAlign: 'center', paddingTop: 2, paddingBottom: 3 },
});
