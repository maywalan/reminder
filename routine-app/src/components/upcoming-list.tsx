import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist';

import { TodoItem } from '@/components/todo-item';
import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { findFuturePlans } from '@/utils/countdown';
import { fromISO } from '@/utils/dates';

function shortDateLabel(dateISO: string) {
  return fromISO(dateISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Groups plans (already date/time sorted) into per-day buckets, preserving date order. */
function groupByDate(items: Plan[]): [string, Plan[]][] {
  const byDate = new Map<string, Plan[]>();
  for (const p of items) {
    const bucket = byDate.get(p.date);
    if (bucket) bucket.push(p);
    else byDate.set(p.date, [p]);
  }
  return [...byDate.entries()];
}

export function UpcomingList() {
  const theme = useTheme();
  const router = useRouter();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const reorderPlans = usePlannerStore((s) => s.reorderPlans);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const filterGroupId = usePlannerStore((s) => s.filterGroupId);
  const filterColor = usePlannerStore((s) => s.filterColor);
  const upcoming = findFuturePlans(plans).filter(
    (p) => (!filterGroupId || p.groupId === filterGroupId) && (!filterColor || p.color === filterColor)
  );

  if (upcoming.length === 0) return null;

  const nearestDayMarker = fromISO(upcoming[0].date)
    .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
    .toUpperCase();

  // Drag-reorder is scoped to a single day (mirrors Today's own `order` field/behavior) — a
  // future day's plans can only be shuffled among themselves, never dragged onto another day,
  // so each day gets its own small NestableDraggableFlatList inside the shared scroll container.
  const dayGroups = groupByDate(upcoming).map(([date, dayItems]) => {
    const hasManualOrder = plans.some((p) => p.date === date && p.order !== undefined);
    const sorted = hasManualOrder ? [...dayItems].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)) : dayItems;
    return { date, items: sorted };
  });

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>UPCOMING</Text>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <Text style={[styles.dayMarker, { color: theme.textTertiary }]}>{nearestDayMarker}</Text>
      </View>
      {dayGroups.map(({ date, items }) => (
        <View key={date}>
          <Text style={[styles.dayGroupLabel, { color: theme.textTertiary }]}>{shortDateLabel(date).toUpperCase()}</Text>
          <NestableDraggableFlatList
            data={items}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => reorderPlans(date, data.map((p) => p.id))}
            onPlaceholderIndexChange={() => Haptics.selectionAsync()}
            renderItem={({ item, drag, isActive }) => (
              <TodoItem
                plan={item}
                group={groups.find((g) => g.id === item.groupId)}
                selectMode={selectMode}
                selected={selectedIds.includes(item.id)}
                isActive={isActive}
                onToggleComplete={() => toggleComplete(item.id)}
                onToggleSelect={() => toggleSelected(item.id)}
                onPress={() => router.push({ pathname: '/add-plan', params: { id: item.id } })}
                onDelete={() => deletePlan(item.id)}
                onDrag={drag}
              />
            )}
          />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  sectionTitle: { fontSize: Typography.caption, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: 0.9 },
  divider: { flex: 1, height: 1 },
  dayMarker: { fontSize: Typography.label, fontWeight: '500', fontFamily: Fonts[500] },
  dayGroupLabel: {
    fontSize: Typography.label,
    fontWeight: '600',
    fontFamily: Fonts[600],
    letterSpacing: 0.4,
    paddingHorizontal: 22,
    marginBottom: 6,
  },
});
