import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { TodoItem } from '@/components/todo-item';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { findPastLivePlans } from '@/utils/countdown';

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
  const past = findPastLivePlans(plans);

  if (past.length === 0) return null;

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>PAST ACTIVITY</Text>
      </View>
      {past.map((plan) => (
        <TodoItem
          key={plan.id}
          plan={plan}
          group={groups.find((g) => g.id === plan.groupId)}
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
  sectionRow: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
});
