import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TodoItem } from '@/components/todo-item';
import { Fonts, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { findPastPlans } from '@/utils/countdown';
import { fromISO } from '@/utils/dates';

function shortDateLabel(dateISO: string) {
  return fromISO(dateISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const DEFAULT_WINDOW_DAYS = 30;
const SEE_ALL_WINDOW_DAYS = 365;

export function PastActivityList() {
  const theme = useTheme();
  const router = useRouter();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const filterGroupId = usePlannerStore((s) => s.filterGroupId);
  const filterColor = usePlannerStore((s) => s.filterColor);
  const [seeAll, setSeeAll] = useState(false);
  const past = findPastPlans(plans, seeAll ? SEE_ALL_WINDOW_DAYS : DEFAULT_WINDOW_DAYS).filter(
    (p) => (!filterGroupId || p.groupId === filterGroupId) && (!filterColor || p.color === filterColor)
  );

  if (past.length === 0) return null;

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PAST ACTIVITY</Text>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        {!seeAll && (
          <Pressable onPress={() => setSeeAll(true)} hitSlop={8}>
            <Text style={[styles.seeAll, { color: theme.accentStrong }]}>See all</Text>
          </Pressable>
        )}
      </View>
      {past.map((plan) => (
        <TodoItem
          key={plan.id}
          plan={plan}
          group={groups.find((g) => g.id === plan.groupId)}
          dateLabel={shortDateLabel(plan.date)}
          selectMode={selectMode}
          selected={selectedIds.includes(plan.id)}
          onToggleComplete={() => toggleComplete(plan.id)}
          onToggleSelect={() => toggleSelected(plan.id)}
          onPress={() => router.push({ pathname: '/add-plan', params: { id: plan.id } })}
          onDelete={() => deletePlan(plan.id)}
          onDrag={() => {}}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  sectionTitle: { fontSize: Typography.caption, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: 0.9 },
  divider: { flex: 1, height: 1 },
  seeAll: { fontSize: Typography.rowValue, fontWeight: '600', fontFamily: Fonts[600] },
});
