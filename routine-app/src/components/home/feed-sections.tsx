import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { CheckIcon, ChevronRightIcon, PlanIcon, XIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { TOOL_ROW_SPRING } from '@/components/home/search-field';
import { planPalette, useHomeTokens, useHomeType } from '@/components/home/tokens';
import { useTheme } from '@/hooks/use-theme';
import type { Group, Plan } from '@/store/types';
import type { SearchSection } from '@/utils/plan-search';
import { durationMinutes, formatDuration, type UpcomingDay } from '@/utils/home-feed';
import { resolvePlanIcon } from '@/utils/plan-icons';
import { fromISO, toISO } from '@/utils/dates';
import { t as tr } from '@/i18n';
import { fmtTime, weekdayShort } from '@/i18n/format';

/**
 * The Upcoming and Earlier sections of Home's feed sheet (design_handoff_tickle_home_timeline),
 * plus the search results list (unchanged from design_handoff_tickle_home_7).
 */

interface SelectProps {
  selectMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

function SmallRow({
  plan,
  timeLabel,
  marker,
  title,
  right,
  s,
}: {
  plan: Plan;
  timeLabel: string;
  marker: React.ReactNode;
  title: React.ReactNode;
  right?: React.ReactNode;
  s: SelectProps;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  const theme = useTheme();
  const selected = s.selectMode && s.selectedIds.includes(plan.id);
  return (
    <Pressable
      onPress={() => (s.selectMode ? s.onToggleSelect(plan.id) : s.onOpen(plan.id))}
      style={({ pressed }) => [
        styles.row,
        (pressed || selected) && {
          backgroundColor: selected ? theme.accentSoft : k.rail,
        },
      ]}>
      <Text style={[styles.time, t.dayLabel, { color: k.ink38 }]}>{timeLabel}</Text>
      <View style={styles.markerCol}>{marker}</View>
      <View style={styles.content}>
        {title}
        {right}
      </View>
    </Pressable>
  );
}

/** "Tomorrow · Thu 15" for the first day after today, otherwise "Fri 16". */
function upcomingDayLabel(dateISO: string, todayISO: string) {
  const d = fromISO(dateISO);
  const short = `${weekdayShort(d.getDay())} ${d.getDate()}`;
  const t = fromISO(todayISO);
  t.setDate(t.getDate() + 1);
  return dateISO === toISO(t) ? `${tr('home.tomorrow')} · ${short}` : short;
}

/** "Today", "Yesterday", else "Mon 12" — the label on each Earlier summary card. */
function earlierDayLabel(dateISO: string, todayISO: string) {
  if (dateISO === todayISO) return tr('home.today');
  const y = fromISO(todayISO);
  y.setDate(y.getDate() - 1);
  if (dateISO === toISO(y)) return tr('home.yesterday');
  const d = fromISO(dateISO);
  return `${weekdayShort(d.getDay())} ${d.getDate()}`;
}

/**
 * One day's card in Upcoming and Earlier (user's design, 2026-10-22): a day label over a one-line
 * summary ("5 missed · 1 done", "2 tasks · 09:00") on a white card, with Review › on the right.
 * Tapping it grows the card open to show the day's rows inside it, on the search row's spring.
 */
function DayCard({
  label,
  summary,
  openSummary,
  more,
  open,
  onPress,
  children,
}: {
  label: string;
  summary: React.ReactNode;
  /** Shown instead of `summary` while open, so it doesn't repeat the first row (Upcoming's "2 tasks"). */
  openSummary?: React.ReactNode;
  /** Replaces "Review" while closed, e.g. Upcoming's "+2 more"; "" shows the chevron alone. */
  more?: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const bodyHeight = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = reduceMotion ? (open ? 1 : 0) : withSpring(open ? 1 : 0, TOOL_ROW_SPRING);
  }, [open, reduceMotion, progress]);

  const press = () => {
    if (!reduceMotion) scale.value = withSequence(withTiming(0.97, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 300, mass: 0.6 }));
    onPress();
  };

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({ height: Math.max(0, bodyHeight.value * progress.value), opacity: Math.min(1, progress.value) }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 90}deg` }] }));

  return (
    <Reanimated.View style={[styles.dayCard, { backgroundColor: k.sheet, borderColor: k.upcomingBorder }, cardStyle]}>
      <Pressable onPress={press} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.summary}>
        <View style={styles.summaryText}>
          <Text numberOfLines={1} style={[t.sumLabel, { color: k.ink50 }]}>
            {label}
          </Text>
          <Text numberOfLines={1} style={[t.sumCount, { color: k.ink }]}>
            {open && openSummary ? openSummary : summary}
          </Text>
        </View>
        <View style={styles.review}>
          {/* Upcoming leaves the text out for a one-plan day ("" from `more`), so every card there reads chevron or "+N more" (critique, 2026-10-28). */}
          {!!(open || more !== '') && <Text style={[t.blockLink, { color: k.azureDark }]}>{open ? tr('home.hide') : (more ?? tr('home.review'))}</Text>}
          <Reanimated.View style={chevron}>
            <ChevronRightIcon size={14} color={k.azureDark} strokeWidth={2.4} />
          </Reanimated.View>
        </View>
      </Pressable>
      {/* Rows are always laid out (absolutely, so they keep their natural height) and the clip animates to that height. */}
      <Reanimated.View style={[styles.dayBody, bodyStyle]}>
        <View onLayout={(e) => (bodyHeight.value = e.nativeEvent.layout.height)} style={[styles.dayRows, { borderTopColor: k.earlierBorder }]}>
          {children}
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
}

/** "5 missed · 1 done" — either half is left out when it's zero. */
function EarlierSummary({ missed, done }: { missed: number; done: number }) {
  const k = useHomeTokens();
  const t = useHomeType();
  return (
    <>
      {missed > 0 && <Text style={[t.sumCount, { color: k.rose }]}>{tr('home.missedCount', { n: missed })}</Text>}
      {missed > 0 && done > 0 && <Text style={[t.sumCount, { color: k.ink45 }]}>{' · '}</Text>}
      {done > 0 && tr('home.doneCount', { n: done })}
    </>
  );
}

function BlockHeader({ title, right, tight }: { title: string; right: React.ReactNode; tight?: boolean }) {
  const k = useHomeTokens();
  const t = useHomeType();
  return (
    <View style={[styles.blockHead, tight && styles.blockHeadTight]}>
      <Text style={[t.blockTitle, { color: k.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

/**
 * Upcoming: the next 7 days, one DayCard each ("Tomorrow · Fri 23" / "2 tasks · 09:00"), opening to
 * that day's plans. No checkbox — a future plan can't be completed. With nothing coming up, a
 * single white card says so (user, 2026-10-22).
 */
export function UpcomingBlock({ days, groups, ...s }: SelectProps & { days: UpcomingDay[]; groups: Group[] }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const [openDays, setOpenDays] = useState<string[]>([]);
  const toggleDay = (iso: string) => setOpenDays((v) => (v.includes(iso) ? v.filter((d) => d !== iso) : [...v, iso]));
  const todayISO = toISO(new Date());
  return (
    <View>
      <BlockHeader title={tr('home.upcoming')} right={<Text style={[t.blockNote, { color: k.ink50 }]}>{tr('home.nextDays')}</Text>} />
      {days.length === 0 && (
        <Reanimated.View entering={FadeInUp.duration(260)} style={[styles.dayCard, styles.emptyCard, { backgroundColor: k.sheet, borderColor: k.upcomingBorder }]}>
          <Text style={[t.sumLabel, { color: k.ink50 }]}>{tr('home.noUpcoming')}</Text>
        </Reanimated.View>
      )}
      {days.map((d) => {
        const first = d.plans[0];
        return (
          <Reanimated.View key={d.dateISO} entering={FadeInUp.duration(260)} style={styles.pastGroup}>
            <DayCard
              label={upcomingDayLabel(d.dateISO, todayISO)}
              // The day's first plan by name, quieter than today's cards, so tomorrow can be read without a tap (critique, 2026-10-28).
              summary={
                <>
                  <Text style={[t.upTitle, { color: k.ink }]}>{first.name}</Text>
                  <Text style={[t.upTitle, { color: k.ink45 }]}>{` · ${first.allDay ? tr('home.allDay') : fmtTime(first.time)}`}</Text>
                </>
              }
              openSummary={<Text style={[t.upTitle, { color: k.ink }]}>{tr('home.taskCount', { count: d.plans.length })}</Text>}
              more={d.plans.length > 1 ? tr('home.moreCount', { n: d.plans.length - 1 }) : ''}
              open={s.selectMode || openDays.includes(d.dateISO)}
              onPress={() => toggleDay(d.dateISO)}>
              {d.plans.map((p, i) => {
                const icon = resolvePlanIcon(p);
                const group = groups.find((g) => g.id === p.groupId);
                const detail = p.endTime && !p.allDay ? formatDuration(durationMinutes(p)) : p.location;
                const sub = [group?.name, detail].filter(Boolean).join(' · ');
                const selected = s.selectMode && s.selectedIds.includes(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => (s.selectMode ? s.onToggleSelect(p.id) : s.onOpen(p.id))}
                    style={({ pressed }) => [
                      styles.upRow,
                      { borderBottomColor: k.earlierBorder },
                      i === d.plans.length - 1 && { borderBottomWidth: 0 },
                      (pressed || selected) && { backgroundColor: selected ? k.azureTint : k.rail },
                    ]}>
                    {icon && (
                      <View style={[styles.upIcon, { backgroundColor: `${p.color}1A` }]}>
                        <PlanIcon id={icon} size={14} color={p.color} />
                      </View>
                    )}
                    <View style={styles.upText}>
                      <Text numberOfLines={1} style={[t.upTitle, { color: k.ink }]}>
                        {p.name}
                      </Text>
                      {!!sub && (
                        <Text numberOfLines={1} style={[t.upSub, { color: k.ink50 }]}>
                          {sub}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.timeChip, { backgroundColor: k.azureTint }]}>
                      <Text style={[t.timeChip, { color: k.azureDark }]}>{p.allDay ? tr('home.allDay') : fmtTime(p.time)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </DayCard>
          </Reanimated.View>
        );
      })}
    </View>
  );
}

function hhmm(ms: number) {
  const d = new Date(ms);
  return fmtTime(`${d.getHours()}:${d.getMinutes()}`);
}

/**
 * Earlier (design_handoff_tickle_home_timeline 1c): past plans grouped by day, newest first —
 * only yesterday's by default (today's are already in the timeline above; user, 2026-10-22), the
 * last 30 days with See all. Tapping a row opens the plan (a missed one can be rescheduled from there).
 */
export function EarlierBlock({
  older,
  seeAll,
  onToggleSeeAll,
  ...s
}: SelectProps & {
  older: Plan[];
  seeAll: boolean;
  onToggleSeeAll: () => void;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  const [openDays, setOpenDays] = useState<string[]>([]);
  if (older.length === 0) return null;
  const toggleDay = (iso: string) => setOpenDays((v) => (v.includes(iso) ? v.filter((d) => d !== iso) : [...v, iso]));
  const todayISO = toISO(new Date());
  const y = fromISO(todayISO);
  y.setDate(y.getDate() - 1);
  const yesterdayISO = toISO(y);
  const rows = seeAll ? older : older.filter((p) => p.date === yesterdayISO);
  const days: { dateISO: string; plans: Plan[] }[] = [];
  for (const p of rows) {
    const last = days[days.length - 1];
    if (last?.dateISO === p.date) last.plans.push(p);
    else days.push({ dateISO: p.date, plans: [p] });
  }
  const showToggle = older.some((p) => p.date !== yesterdayISO) || seeAll;

  return (
    <View>
      <BlockHeader
        tight
        title={tr('home.earlier')}
        right={
          showToggle ? (
            <Pressable onPress={onToggleSeeAll} hitSlop={10}>
              <Text style={[t.blockLink, { color: k.azureDark }]}>{seeAll ? tr('home.showLess') : tr('home.seeAll')}</Text>
            </Pressable>
          ) : null
        }
      />
      {days.length === 0 && (
        <View style={[styles.dayCard, styles.emptyCard, { backgroundColor: k.sheet, borderColor: k.upcomingBorder }]}>
          <Text style={[t.sumLabel, { color: k.ink50 }]}>{tr('home.noneYesterday')}</Text>
        </View>
      )}
      {days.map((d) => (
        <Reanimated.View key={d.dateISO} entering={FadeInUp.duration(260)} style={styles.pastGroup}>
          <DayCard
            label={earlierDayLabel(d.dateISO, todayISO)}
            summary={<EarlierSummary missed={d.plans.filter((p) => !p.completed).length} done={d.plans.filter((p) => p.completed).length} />}
            open={s.selectMode || openDays.includes(d.dateISO)}
            onPress={() => toggleDay(d.dateISO)}>
            {/* Rows stay open in Edit mode so they can be selected. */}
              {d.plans.map((p, i) => {
                const done = p.completed;
                const icon = resolvePlanIcon(p);
                const selected = s.selectMode && s.selectedIds.includes(p.id);
                const when = p.allDay ? tr('home.allDayLower') : fmtTime(p.time);
                const meta = done ? tr('home.doneAt', { time: p.completedAt ? hhmm(p.completedAt) : when }) : tr('home.missedAt', { time: when });
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => (s.selectMode ? s.onToggleSelect(p.id) : s.onOpen(p.id))}
                    style={({ pressed }) => [
                      styles.pastRow,
                      { borderBottomColor: k.earlierBorder },
                      i === d.plans.length - 1 && { borderBottomWidth: 0 },
                      (pressed || selected) && { backgroundColor: selected ? k.azureTint : k.rail },
                    ]}>
                    {done ? (
                      <View style={[styles.mark, { backgroundColor: k.green }]}>
                        <CheckIcon size={10} color="#fff" strokeWidth={3.2} />
                      </View>
                    ) : (
                      <View style={[styles.mark, styles.missedMark, { borderColor: k.roseRing }]}>
                        <XIcon size={9} color={k.roseMark} strokeWidth={3} />
                      </View>
                    )}
                    {icon && <PlanIcon id={icon} size={15} color={k.ink40} />}
                    <Text numberOfLines={1} style={[t.pastTitle, styles.pastTitle, { color: k.ink60, textDecorationLine: done ? 'line-through' : 'none' }]}>
                      {p.name}
                    </Text>
                    <Text style={[t.pastMeta, { color: done ? k.ink45 : k.rose }]}>{meta}</Text>
                  </Pressable>
                );
              })}
          </DayCard>
        </Reanimated.View>
      ))}
    </View>
  );
}

/** Home's search results — every matching plan from any date, one block per day. */
export function SearchResults({ sections, groups, ...s }: SelectProps & { sections: SearchSection[]; groups: Group[] }) {
  const k = useHomeTokens();
  const t = useHomeType();
  if (sections.length === 0) {
    return <Text style={[t.meta, styles.noResults, { color: k.ink50 }]}>{tr('home.noResults')}</Text>;
  }
  return (
    <View style={styles.results}>
      {sections.map((section) => (
        <View key={section.dateISO} style={styles.block}>
          <View style={styles.header}>
            <Text style={[t.sectionLabel, styles.headerTitle, { color: k.ink50 }]}>{section.title}</Text>
          </View>
          <View style={styles.rows}>
            {section.plans.map((p) => {
              const group = groups.find((g) => g.id === p.groupId);
              return (
                <SmallRow
                  key={p.id}
                  plan={p}
                  s={s}
                  timeLabel={p.allDay ? tr('home.allDay') : fmtTime(p.time)}
                  marker={
                    <View
                      style={[
                        styles.dot7,
                        p.completed
                          ? { backgroundColor: k.doneDot }
                          : {
                              borderWidth: 1.5,
                              borderColor: planPalette(p.color, k.dark).base,
                            },
                      ]}
                    />
                  }
                  title={
                    <Text
                      numberOfLines={1}
                      style={[
                        t.smallTitle,
                        styles.title,
                        {
                          color: p.completed ? k.ink38 : k.ink,
                          textDecorationLine: p.completed ? 'line-through' : 'none',
                        },
                      ]}>
                      {p.name}
                    </Text>
                  }
                  right={
                    group ? (
                      <Text numberOfLines={1} style={[t.metaStrong, styles.groupTag, { color: planPalette(group.color, k.dark).text }]}>
                        {group.name}
                      </Text>
                    ) : undefined
                  }
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 2 },
  // Everything starts on the sheet's content edge (no extra left padding), so titles, day labels,
  // Upcoming cards and Earlier marks line up with the timeline above.
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 6 },
  // Earlier sits right under Upcoming's last card (which already has an 8pt margin), so less room above it (user, 2026-10-22).
  blockHeadTight: { paddingTop: 6 },
  dayLabel: {},
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1 },
  upIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  upText: { flex: 1, minWidth: 0, gap: 0 },
  timeChip: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 },
  // Earlier is a tight list: short rows and little space between day groups (user, 2026-10-19).
  pastGroup: { gap: 0, marginBottom: 8 },
  dayCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  emptyCard: { paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  summaryText: { flex: 1, minWidth: 0, gap: 1 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dayBody: { overflow: 'hidden' },
  dayRows: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, borderTopWidth: 1 },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderBottomWidth: 1 },
  mark: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  missedMark: { borderWidth: 2 },
  pastTitle: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { flex: 1 },
  rows: { paddingHorizontal: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  time: { width: 38, textAlign: 'right' },
  markerCol: { width: 9, paddingLeft: 1 },
  dot7: { width: 7, height: 7, borderRadius: 3.5 },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { flex: 1, minWidth: 0 },
  results: { gap: 16 },
  noResults: { textAlign: 'center', paddingVertical: 32 },
  groupTag: { maxWidth: 110 },
});
