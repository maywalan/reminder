import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PaletteIcon, PlanIcon, PlusIcon, TagIcon } from '@/components/icon';
import { addDays, startOfWeek, WeekStrip } from '@/components/home/week-strip';
import { useHomeTokens } from '@/components/home/tokens';
import { Text } from '@/components/text';
import { Tickle } from '@/components/tickle';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { displayYear, fmtDate, fmtTime, monthShort, weekdayLetter, weekdayShort } from '@/i18n/format';
import { fromISO, toISO } from '@/utils/dates';
import type { PlanIconId } from '@/utils/plan-icons';
import { generateRepeatOccurrences } from '@/utils/repeat';

/** What the user is building on the New Plan step; every later screen shows these choices. */
export type OnbRepeat = 'none' | 'daily' | 'weekdays' | 'weekly';
export interface OnbDraft {
  name: string;
  icon: PlanIconId | null;
  color: string;
  timeMode: 'specific' | 'range' | 'allDay';
  start: Date;
  end: Date;
  repeat: OnbRepeat;
  live: boolean;
}

export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Every date (ISO) the draft lands on, up to `untilISO`. */
export function draftDates(draft: OnbDraft, untilISO: string): string[] {
  const date = toISO(draft.start);
  const time = hhmm(draft.start);
  if (draft.repeat === 'none') return [date];
  const occ =
    draft.repeat === 'daily'
      ? generateRepeatOccurrences(date, time, '1d', untilISO)
      : draft.repeat === 'weekly'
        ? generateRepeatOccurrences(date, time, 'week', untilISO)
        : generateRepeatOccurrences(date, time, 'custom', untilISO, { interval: 1, unit: 'week', weekdays: [1, 2, 3, 4, 5] });
  return occ.map((o) => o.date);
}

const APP_ICON = require('../../../assets/images/icon.png');
const APP_ICON_DARK = require('../../../assets/images/icon-dark.png');

const ink = (a: number) => `rgba(16,32,58,${a})`;

// ─── 02 · Home with a pulsing + ─────────────────────────────────────────────────────────────

/** A still copy of Home (empty Today, Upcoming) where only the + works. */
export function MockHome({ onPlus }: { onPlus: () => void }) {
  const theme = useTheme();
  const k = useHomeTokens();
  const reduce = useReducedMotion();
  const now = new Date();
  const todayISO = toISO(now);
  const hour = now.getHours();
  const greet = hour < 5 ? t('home.greeting.night') : hour < 12 ? t('home.greeting.morning') : hour < 18 ? t('home.greeting.afternoon') : t('home.greeting.evening');

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [reduce, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.55 }] }));

  return (
    <View style={[styles.homeFrame, { backgroundColor: k.page, borderColor: k.sheetBorder }]}>
      <View pointerEvents="none">
        <View style={styles.homeHead}>
          <Tickle size={36} mood="idle" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[styles.homeGreet, { color: theme.text }]}>
              {t('home.greeting.withName', { greeting: greet, name: t('onb.guest') })}
            </Text>
            <Text numberOfLines={1} style={[styles.homeDate, { color: theme.textSecondary }]}>
              {fmtDate(now, { weekday: 'long', month: 'long' }, 'dm')}
            </Text>
          </View>
          {[PaletteIcon, TagIcon].map((Icon, i) => (
            <View key={i} style={[styles.homeIconBtn, { backgroundColor: theme.surface, borderColor: k.sheetBorder }]}>
              <Icon size={15} color={theme.text} />
            </View>
          ))}
        </View>

        <View style={[styles.homeCard, { backgroundColor: theme.surface, borderColor: k.sheetBorder }]}>
          <WeekStrip
            weekStart={startOfWeek(now)}
            weekOffset={0}
            selectedISO={todayISO}
            todayISO={todayISO}
            markedISOs={new Set()}
            onStep={() => {}}
            onToday={() => {}}
            onSelect={() => {}}
            embedded
          />
          <View style={[styles.emptyDay, { borderColor: theme.accentBorder, backgroundColor: k.dark ? theme.surface2 : '#F7FAFF' }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('onb.nothingPlanned')}</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>{t('onb.nothingPlannedSub')}</Text>
          </View>
        </View>

        <View style={styles.upHead}>
          <Text style={[styles.upTitle, { color: theme.text }]}>{t('home.upcoming')}</Text>
          <Text style={[styles.upSub, { color: theme.textSecondary }]}>{t('home.nextDays')}</Text>
        </View>
        <View style={[styles.upCard, { backgroundColor: theme.surface, borderColor: k.sheetBorder }]}>
          <Text style={[styles.upEmpty, { color: theme.textSecondary }]}>{t('onb.nothingComing')}</Text>
        </View>
      </View>

      <View style={styles.fabWrap}>
        <View style={[styles.coach, { backgroundColor: k.dark ? '#F2F5FA' : '#10203A' }]}>
          <Text style={[styles.coachText, { color: k.dark ? '#10203A' : '#FFFFFF' }]}>{t('onb.tapTitle')}</Text>
          <View style={[styles.coachTail, { borderTopColor: k.dark ? '#F2F5FA' : '#10203A' }]} />
        </View>
        <View style={styles.fabSlot}>
          <Reanimated.View pointerEvents="none" style={[styles.fabRing, { backgroundColor: theme.accent }, ring]} />
          <Pressable
            onPress={onPlus}
            accessibilityRole="button"
            accessibilityLabel={t('onb.tapTitle')}
            style={({ pressed }) => [styles.fab, { backgroundColor: theme.accentFill, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <PlusIcon size={26} color={theme.onAccent} strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── 04 · Live Activity ─────────────────────────────────────────────────────────────────────

// Colours from targets/widget/TickleLiveActivity.swift (LAPalette), so the demo matches the real one.
const LA_DARK = { bg: '#1C1D22', text: '#FFFFFF', sub: 'rgba(255,255,255,0.6)', count: '#6FD08C', track: 'rgba(255,255,255,0.14)', bar: '#6FD08C', doneBg: 'rgba(255,255,255,0.12)', doneText: '#FFFFFF' };
const LA_LIGHT = { bg: '#F4F2F8', text: '#10203A', sub: 'rgba(16,32,58,0.6)', count: '#2F7A4E', track: 'rgba(16,32,58,0.1)', bar: '#3F9A63', doneBg: '#FFFFFF', doneText: '#10203A' };
const DEMO_FROM = 20;

function IconTile({ draft, size, round }: { draft: OnbDraft; size: number; round?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: round ? size / 2 : size * 0.26, backgroundColor: draft.color, alignItems: 'center', justifyContent: 'center' }}>
      {draft.icon ? <PlanIcon id={draft.icon} size={size * 0.58} color="#FFFFFF" /> : <Tickle size={size * 0.9} mood="idle" />}
    </View>
  );
}

function LaCard({ draft, palette, title, sub, big, progress }: { draft: OnbDraft; palette: typeof LA_DARK; title: string; sub: string; big: string; progress: number }) {
  return (
    <View style={[styles.laCard, { backgroundColor: palette.bg }]}>
      <View style={styles.laRow}>
        <IconTile draft={draft} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.laTitle, { color: palette.text }]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[styles.laSub, { color: palette.sub }]}>
            {sub}
          </Text>
        </View>
        <Text style={[styles.laBig, { color: palette.count }]}>{big}</Text>
      </View>
      <View style={[styles.laTrack, { backgroundColor: palette.track }]}>
        <View style={[styles.laBar, { backgroundColor: palette.bar, width: `${Math.max(4, progress * 100)}%` }]} />
      </View>
      <View style={[styles.laDone, { backgroundColor: palette.doneBg, borderColor: palette === LA_LIGHT ? 'rgba(16,32,58,0.12)' : 'transparent' }]}>
        <Text style={[styles.laDoneText, { color: palette.doneText }]}>{t('common.done')}</Text>
      </View>
    </View>
  );
}

function Island({ draft, right }: { draft: OnbDraft; right: string }) {
  return (
    <View style={styles.island}>
      <IconTile draft={draft} size={22} round />
      <Text style={styles.islandText}>{right}</Text>
    </View>
  );
}

/** The Dynamic Island + Lock Screen card counting down, then the "Now" state. A picture only: no real activity starts. */
export function LiveActivityDemo({ draft }: { draft: OnbDraft }) {
  const [left, setLeft] = useState(DEMO_FROM);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 0 ? DEMO_FROM : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const clock = `0:${String(left).padStart(2, '0')}`;
  const time = fmtTime(hhmm(draft.start));
  const name = draft.name.trim() || t('onb.sampleName');
  const startsLabel = draft.timeMode === 'allDay' ? t('common.allDay') : t('onb.starts', { time });
  const dueLabel = draft.timeMode === 'allDay' ? t('onb.allDayReminder') : t('onb.reminderAt', { time });

  return (
    <LinearGradient colors={['#23264A', '#382F5A', '#5A3A63']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.laStage}>
      <Text style={styles.laLabel}>{t('onb.countingDown')}</Text>
      <Island draft={draft} right={left === 0 ? t('onb.now') : clock} />
      <LaCard draft={draft} palette={LA_DARK} title={name} sub={startsLabel} big={left === 0 ? t('onb.now') : clock} progress={1 - left / DEMO_FROM} />
      <Text style={[styles.laLabel, { marginTop: 8 }]}>{t('onb.whenTime')}</Text>
      <Island draft={draft} right={t('onb.now')} />
      <LaCard draft={draft} palette={LA_LIGHT} title={name} sub={dueLabel} big={t('onb.now')} progress={1} />
    </LinearGradient>
  );
}

// ─── 05 · Notification + widgets ────────────────────────────────────────────────────────────

export function NotificationDemo({ draft }: { draft: OnbDraft }) {
  const dark = useEffectiveScheme() === 'dark';
  return (
    <View style={[styles.notif, { backgroundColor: dark ? 'rgba(44,46,58,0.96)' : 'rgba(255,255,255,0.94)' }]}>
      {/* The real app icon (light/dark variants), as iOS shows it on a notification. */}
      <Image source={dark ? APP_ICON_DARK : APP_ICON} style={styles.notifIcon} accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.notifTitle, { color: dark ? '#F2F5FA' : '#10203A' }]}>
          {draft.name.trim() || t('onb.sampleName')}
        </Text>
        <Text numberOfLines={1} style={[styles.notifBody, { color: dark ? 'rgba(242,245,250,0.75)' : ink(0.75) }]}>
          {t('notif.inMin', { n: 10 })}
        </Text>
      </View>
      <Text style={[styles.notifNow, { color: dark ? 'rgba(242,245,250,0.5)' : ink(0.5) }]}>{t('onb.notifNow')}</Text>
    </View>
  );
}

export type WidgetSize = 'small' | 'medium' | 'large';

const W = { bg: '#222438', text: '#FFFFFF', sub: 'rgba(255,255,255,0.5)', faint: 'rgba(255,255,255,0.28)', line: 'rgba(255,255,255,0.07)' };

/** The calendar widgets on a wallpaper, drawn from the draft. "Today" is the plan's first day so it shows up. */
export function WidgetDemo({ draft, size }: { draft: OnbDraft; size: WidgetSize }) {
  // Anchored on the first day the plan really happens (a Weekdays plan picked on a Saturday starts Monday).
  const dates = useMemo(() => new Set(draftDates(draft, toISO(addDays(draft.start, 70)))), [draft]);
  const first = useMemo(() => {
    const earliest = [...dates].sort()[0];
    return earliest ? fromISO(earliest) : new Date(draft.start.getFullYear(), draft.start.getMonth(), draft.start.getDate());
  }, [dates, draft.start]);
  const name = draft.name.trim() || t('onb.sampleName');
  const time = draft.timeMode === 'allDay' ? t('common.allDay') : fmtTime(hhmm(draft.start));

  return (
    <LinearGradient colors={['#A9BDF6', '#BBA9EE', '#EDB9D2']} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.wall}>
      {size === 'small' && (
        <View style={styles.smallRow}>
          <View style={[styles.widget, styles.smallWidget]}>
            <Text style={[styles.wCaps, { color: '#FF6B6B' }]}>{weekdayShort(first.getDay()).toUpperCase()}</Text>
            <Text style={styles.wBigNum}>{first.getDate()}</Text>
            <View style={styles.wPlanRow}>
              <View style={[styles.wPlanBar, { backgroundColor: draft.color }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.wPlanName}>
                  {name}
                </Text>
                <Text style={styles.wPlanTime}>{time}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.widget, styles.smallWidget]}>
            <Text style={[styles.wCaps, { color: W.sub }]}>{t('onb.next3')}</Text>
            {[0, 1, 2].map((i) => {
              const d = addDays(first, i);
              const has = dates.has(toISO(d));
              return (
                <View key={i} style={styles.wNextRow}>
                  <Text style={styles.wNextDay}>{i === 0 ? t('onb.today') : `${weekdayShort(d.getDay())} ${d.getDate()}`}</Text>
                  <View style={styles.wPlanRow}>
                    {has && <View style={[styles.wPlanBarSm, { backgroundColor: draft.color }]} />}
                    <Text numberOfLines={1} style={[styles.wNextPlan, !has && { color: W.faint }]}>
                      {has ? name : t('onb.freeDay')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
      {size !== 'small' && <MonthWidget first={first} dates={dates} color={draft.color} weeks={size === 'medium' ? 2 : 6} />}
    </LinearGradient>
  );
}

function MonthWidget({ first, dates, color, weeks }: { first: Date; dates: Set<string>; color: string; weeks: 2 | 6 }) {
  const firstISO = toISO(first);
  const gridStart = weeks === 6 ? startOfWeek(new Date(first.getFullYear(), first.getMonth(), 1)) : startOfWeek(first);
  const count = dates.has(firstISO) ? 1 : 0;
  return (
    <View style={[styles.widget, { paddingHorizontal: 12 }]}>
      <View style={styles.mHead}>
        <Text style={styles.mTitle}>
          {monthShort(first.getMonth())} {displayYear(first.getFullYear())}
        </Text>
        <View style={styles.mPill}>
          <Text style={styles.mPillText}>{count ? t('onb.plansToday', { count }) : t('onb.freeDay')}</Text>
        </View>
      </View>
      <View style={styles.mRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={i} style={styles.mDow}>
            {weekdayLetter(i)}
          </Text>
        ))}
      </View>
      {Array.from({ length: weeks }, (_, w) => (
        <View key={w} style={[styles.mRow, styles.mWeek]}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(gridStart, w * 7 + i);
            const iso = toISO(d);
            const isToday = iso === firstISO;
            const out = weeks === 6 && d.getMonth() !== first.getMonth();
            return (
              <View key={i} style={styles.mCell}>
                <View style={[styles.mNumWrap, isToday && { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.mNum, out && { color: W.faint }, isToday && { color: '#10203A' }]}>{d.getDate()}</Text>
                </View>
                {dates.has(iso) && iso >= firstISO && <View style={[styles.mBar, { backgroundColor: color }]} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Home mock
  homeFrame: { borderRadius: 24, borderWidth: 1, paddingTop: 14, paddingBottom: 14, overflow: 'hidden' },
  homeHead: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, marginBottom: 10 },
  homeGreet: { fontSize: 15, fontWeight: '700' },
  homeDate: { fontSize: 12, fontWeight: '500' },
  homeIconBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  homeCard: { marginHorizontal: 10, borderRadius: 20, borderWidth: 1, paddingTop: 10, paddingBottom: 12 },
  emptyDay: { marginHorizontal: 12, marginTop: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', gap: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptySub: { fontSize: 13, fontWeight: '500' },
  upHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, marginTop: 14, marginBottom: 6 },
  upTitle: { fontSize: 15, fontWeight: '700' },
  upSub: { fontSize: 12, fontWeight: '500' },
  upCard: { marginHorizontal: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 74 },
  upEmpty: { fontSize: 13, fontWeight: '500' },
  fabWrap: { position: 'absolute', right: 14, bottom: 12, alignItems: 'flex-end' },
  coach: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, marginRight: -4 },
  coachText: { fontSize: 13, fontWeight: '700' },
  coachTail: { position: 'absolute', bottom: -6, right: 26, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  fabSlot: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  fabRing: { position: 'absolute', width: 58, height: 58, borderRadius: 29 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B76E8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  // Live Activity
  laStage: { borderRadius: 24, padding: 14, gap: 8 },
  laLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  island: { height: 38, borderRadius: 19, backgroundColor: '#000000', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9 },
  islandText: { color: '#6FD08C', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  laCard: { borderRadius: 22, padding: 14, gap: 10 },
  laRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  laTitle: { fontSize: 17, fontWeight: '700' },
  laSub: { fontSize: 13, fontWeight: '500' },
  laBig: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  laTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  laBar: { height: 5, borderRadius: 3 },
  laDone: { alignSelf: 'flex-end', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 5 },
  laDoneText: { fontSize: 13, fontWeight: '600' },

  // Notification
  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    padding: 10,
    shadowColor: '#10203A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  notifIcon: { width: 42, height: 42, borderRadius: 10 },
  notifTitle: { fontSize: 15, fontWeight: '700' },
  notifBody: { fontSize: 14, fontWeight: '500' },
  notifNow: { fontSize: 12, fontWeight: '500', alignSelf: 'flex-start', marginTop: 2 },

  // Widgets
  wall: { borderRadius: 24, padding: 14 },
  widget: { backgroundColor: W.bg, borderRadius: 20, padding: 12 },
  smallRow: { flexDirection: 'row', gap: 12 },
  smallWidget: { flex: 1, aspectRatio: 1, gap: 4 },
  wCaps: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  wBigNum: { color: W.text, fontSize: 30, fontWeight: '700', lineHeight: 34, marginBottom: 4 },
  wPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wPlanBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  wPlanBarSm: { width: 3, height: 13, borderRadius: 2 },
  wPlanName: { color: W.text, fontSize: 12, fontWeight: '700' },
  wPlanTime: { color: W.sub, fontSize: 12, fontWeight: '500' },
  wNextRow: { marginTop: 3 },
  wNextDay: { color: W.sub, fontSize: 12, fontWeight: '600' },
  wNextPlan: { color: W.text, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mTitle: { color: W.text, fontSize: 14, fontWeight: '700' },
  mPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  mPillText: { color: W.text, fontSize: 12, fontWeight: '600' },
  mRow: { flexDirection: 'row' },
  mWeek: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: W.line, paddingTop: 4, minHeight: 34 },
  mDow: { flex: 1, textAlign: 'center', color: W.sub, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  mCell: { flex: 1, alignItems: 'center', gap: 3 },
  mNumWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mNum: { color: W.text, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  mBar: { height: 4, borderRadius: 2, alignSelf: 'stretch', marginHorizontal: 3 },
});

