import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

import { planPalette, useHomeTokens, useHomeType } from '@/components/home/tokens';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { fromISO, toISO } from '@/utils/dates';

/**
 * The two small-row blocks under the Today sheet (design_handoff_tickle_home_7): Upcoming and
 * Earlier. They sit straight on the grey page — no card — and share the rail's 38/9/content grid
 * so their markers line up under the sheet's.
 */

interface SelectProps {
  selectMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

function dayLabel(dateISO: string) {
  return fromISO(dateISO).toLocaleDateString('en-US', { weekday: 'short' });
}

function Header({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  const k = useHomeTokens();
  const t = useHomeType();
  return (
    <View style={styles.header}>
      <Text style={[t.sectionLabel, styles.headerTitle, { color: k.ink50 }]}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={10}>
        <Text numberOfLines={1} style={[t.link, { color: k.link }]}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
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
      style={({ pressed }) => [styles.row, (pressed || selected) && { backgroundColor: selected ? theme.accentSoft : k.rail }]}>
      <Text style={[styles.time, t.dayLabel, { color: k.ink38 }]}>{timeLabel}</Text>
      <View style={styles.markerCol}>{marker}</View>
      <View style={styles.content}>
        {title}
        {right}
      </View>
    </Pressable>
  );
}

export function UpcomingBlock({ items, onCalendar, ...s }: SelectProps & { items: Plan[]; onCalendar: () => void }) {
  const k = useHomeTokens();
  const t = useHomeType();
  if (items.length === 0) return null;
  return (
    <View style={styles.block}>
      <Header title="Upcoming" action="Calendar" onAction={onCalendar} />
      <View style={styles.rows}>
        {items.map((p, i) => (
          <SmallRow
            key={p.id}
            plan={p}
            s={s}
            timeLabel={i === 0 || items[i - 1].date !== p.date ? dayLabel(p.date) : ''}
            marker={<View style={[styles.dot7, { borderWidth: 1.5, borderColor: planPalette(p.color, k.dark).base }]} />}
            title={
              <Text numberOfLines={1} style={[t.smallTitle, styles.title, { color: k.ink }]}>
                {p.name}
              </Text>
            }
            right={<Text style={[t.meta, { color: k.ink50 }]}>{p.allDay ? 'All day' : p.time}</Text>}
          />
        ))}
      </View>
    </View>
  );
}

export function EarlierBlock({
  items,
  older,
  seeAll,
  onToggleSeeAll,
  onRedo,
  ...s
}: SelectProps & { items: Plan[]; older: Plan[]; seeAll: boolean; onToggleSeeAll: () => void; onRedo: (id: string) => void }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const todayISO = toISO(new Date());
  const rows = seeAll ? [...items, ...older] : items;
  if (items.length === 0 && older.length === 0) return null;

  return (
    <View style={styles.block}>
      <Header title="Earlier" action={seeAll ? 'Show less' : 'See all'} onAction={onToggleSeeAll} />
      <View style={styles.rows}>
        {rows.length === 0 && <Text style={[t.meta, styles.none, { color: k.ink38 }]}>Nothing checked off yet today.</Text>}
        {rows.map((p, i) => {
          const done = p.completed;
          const newDay = p.date !== todayISO && (i === 0 || rows[i - 1].date !== p.date);
          const time = p.date === todayISO ? (p.allDay ? 'All day' : p.time) : newDay ? dayLabel(p.date) : '';
          return (
            <Reanimated.View key={p.id} entering={FadeInUp.duration(260)} layout={LinearTransition.duration(220)}>
              <SmallRow
                plan={p}
                s={s}
                timeLabel={time}
                marker={<View style={[styles.dot7, { backgroundColor: done ? k.doneDot : k.missedDot }]} />}
                title={
                  <Text
                    numberOfLines={1}
                    style={[t.smallTitle, styles.title, { color: done ? k.ink38 : k.ink, textDecorationLine: done ? 'line-through' : 'none' }]}>
                    {p.name}
                  </Text>
                }
                right={
                  done ? undefined : (
                    <Text style={[t.link, { color: k.missedText }]}>
                      Missed ·{' '}
                      <Text onPress={s.selectMode ? undefined : () => onRedo(p.id)} suppressHighlighting={false}>
                        Redo
                      </Text>
                    </Text>
                  )
                }
              />
            </Reanimated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { flex: 1 },
  rows: { paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderRadius: 10 },
  time: { width: 38, textAlign: 'right' },
  markerCol: { width: 9, paddingLeft: 1 },
  dot7: { width: 7, height: 7, borderRadius: 3.5 },
  content: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0 },
  none: { paddingVertical: 7, paddingLeft: 57 },
});
