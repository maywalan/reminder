import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { CheckIcon, PlanIcon, XIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { planPalette, useHomeTokens, useHomeType } from '@/components/home/tokens';
import { useTheme } from '@/hooks/use-theme';
import type { Group, Plan } from '@/store/types';
import type { SearchSection } from '@/utils/plan-search';
import { durationMinutes, formatDuration, type UpcomingDay } from '@/utils/home-feed';
import { resolvePlanIcon } from '@/utils/plan-icons';
import { fromISO, toISO } from '@/utils/dates';
import { t as tr } from '@/i18n';
import { weekdayShort } from '@/i18n/format';

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

/** "Today", "Yesterday · Tue 13", else "Mon 12" — Earlier's day labels. */
function earlierDayLabel(dateISO: string, todayISO: string) {
  if (dateISO === todayISO) return tr('home.today');
  const d = fromISO(dateISO);
  const short = `${weekdayShort(d.getDay())} ${d.getDate()}`;
  const y = fromISO(todayISO);
  y.setDate(y.getDate() - 1);
  return dateISO === toISO(y) ? `${tr('home.yesterday')} · ${short}` : short;
}

function BlockHeader({ title, right }: { title: string; right: React.ReactNode }) {
  const k = useHomeTokens();
  const t = useHomeType();
  return (
    <View style={styles.blockHead}>
      <Text style={[t.blockTitle, { color: k.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

/** Upcoming (design_handoff_tickle_home_timeline 1b): the next 3 days' plans, one soft card row each, grouped by day. No checkbox — a future plan can't be completed. */
export function UpcomingBlock({ days, groups, ...s }: SelectProps & { days: UpcomingDay[]; groups: Group[] }) {
  const k = useHomeTokens();
  const t = useHomeType();
  if (days.length === 0) return null;
  const todayISO = toISO(new Date());
  return (
    <View>
      <BlockHeader title={tr('home.upcoming')} right={<Text style={[t.blockNote, { color: k.ink50 }]}>{tr('home.nextDays')}</Text>} />
      {days.map((d) => (
        <View key={d.dateISO} style={styles.dayGroup}>
          <Text style={[t.groupLabel, styles.dayLabel, { color: k.ink50 }]}>{upcomingDayLabel(d.dateISO, todayISO)}</Text>
          {d.plans.map((p) => {
            const icon = resolvePlanIcon(p);
            const group = groups.find((g) => g.id === p.groupId);
            const detail = p.endTime && !p.allDay ? formatDuration(durationMinutes(p)) : p.location;
            const sub = [group?.name, detail].filter(Boolean).join(' · ');
            const selected = s.selectMode && s.selectedIds.includes(p.id);
            return (
              <BouncyPressable
                key={p.id}
                pressedScale={0.97}
                onPress={() => (s.selectMode ? s.onToggleSelect(p.id) : s.onOpen(p.id))}
                style={[
                  styles.upRow,
                  { backgroundColor: selected ? k.azureTint : k.sheet, borderColor: selected ? k.azure : k.upcomingBorder },
                ]}>
                {icon && (
                  <View style={[styles.upIcon, { backgroundColor: `${p.color}1A` }]}>
                    <PlanIcon id={icon} size={16} color={p.color} />
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
                  <Text style={[t.timeChip, { color: k.azureDark }]}>{p.allDay ? tr('home.allDay') : p.time}</Text>
                </View>
              </BouncyPressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function hhmm(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Earlier (design_handoff_tickle_home_timeline 1c): past plans grouped by day, newest first —
 * today's and yesterday's by default, the last 30 days with See all. Tapping a row opens the plan
 * (a missed one can be rescheduled from there).
 */
export function EarlierBlock({
  items,
  older,
  seeAll,
  onToggleSeeAll,
  ...s
}: SelectProps & {
  items: Plan[];
  older: Plan[];
  seeAll: boolean;
  onToggleSeeAll: () => void;
}) {
  const k = useHomeTokens();
  const t = useHomeType();
  if (items.length === 0 && older.length === 0) return null;
  const todayISO = toISO(new Date());
  const y = fromISO(todayISO);
  y.setDate(y.getDate() - 1);
  const yesterdayISO = toISO(y);
  const rows = [...items, ...(seeAll ? older : older.filter((p) => p.date === yesterdayISO))];
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
        title={tr('home.earlier')}
        right={
          showToggle ? (
            <Pressable onPress={onToggleSeeAll} hitSlop={10}>
              <Text style={[t.blockLink, { color: k.azureDark }]}>{seeAll ? tr('home.showLess') : tr('home.seeAll')}</Text>
            </Pressable>
          ) : null
        }
      />
      {days.length === 0 && <Text style={[t.upSub, styles.none, { color: k.ink45 }]}>{tr('home.noneChecked')}</Text>}
      {days.map((d) => (
        <Reanimated.View key={d.dateISO} entering={FadeInUp.duration(260)} layout={LinearTransition.duration(220)} style={styles.pastGroup}>
          <Text style={[t.groupLabel, styles.dayLabel, { color: k.ink50 }]}>{earlierDayLabel(d.dateISO, todayISO)}</Text>
          {d.plans.map((p) => {
            const done = p.completed;
            const icon = resolvePlanIcon(p);
            const selected = s.selectMode && s.selectedIds.includes(p.id);
            const when = p.allDay ? tr('home.allDayLower') : p.time;
            const meta = done ? tr('home.doneAt', { time: p.completedAt ? hhmm(p.completedAt) : when }) : tr('home.missedAt', { time: when });
            return (
              <Pressable
                key={p.id}
                onPress={() => (s.selectMode ? s.onToggleSelect(p.id) : s.onOpen(p.id))}
                style={({ pressed }) => [
                  styles.pastRow,
                  { borderBottomColor: k.earlierBorder },
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
                  timeLabel={p.allDay ? tr('home.allDay') : p.time}
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
  dayGroup: { gap: 6, marginBottom: 10 },
  dayLabel: {},
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 13, borderWidth: 1 },
  upIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  upText: { flex: 1, minWidth: 0, gap: 0 },
  timeChip: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 },
  // Earlier is a tight list: short rows and little space between day groups (user, 2026-10-19).
  pastGroup: { gap: 0, marginBottom: 8 },
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
  none: { paddingVertical: 7 },
  results: { gap: 16 },
  noResults: { textAlign: 'center', paddingVertical: 32 },
  groupTag: { maxWidth: 110 },
});
