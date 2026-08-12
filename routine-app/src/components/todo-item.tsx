import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, ClockIcon } from '@/components/icon';
import { Radii } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { useTheme } from '@/hooks/use-theme';
import { fmtTime12 } from '@/utils/dates';

interface Props {
  plan: Plan;
  group: Group | undefined;
  editMode: boolean;
  selected: boolean;
  onToggleComplete: () => void;
  onSelect: () => void;
  onPress: () => void;
}

export function TodoItem({ plan, group, editMode, selected, onToggleComplete, onSelect, onPress }: Props) {
  const theme = useTheme();
  const taskColor = plan.color || group?.color || theme.accent;

  const checkBg = editMode
    ? selected
      ? theme.danger
      : theme.surface
    : plan.completed
      ? theme.success
      : theme.surface;
  const checkBorder = editMode ? (selected ? theme.danger : theme.dividerStrong) : plan.completed ? theme.success : theme.dividerStrong;
  const showCheckIcon = editMode ? selected : plan.completed;

  return (
    <Pressable
      onPress={editMode ? onSelect : onPress}
      style={[
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.divider, borderLeftColor: taskColor, opacity: plan.completed ? 0.5 : 1 },
      ]}>
      <Pressable
        onPress={editMode ? onSelect : onToggleComplete}
        hitSlop={8}
        style={[styles.check, { backgroundColor: checkBg, borderColor: checkBorder }]}>
        {showCheckIcon && <CheckIcon size={13} color="#fff" strokeWidth={3} />}
      </Pressable>

      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: plan.completed ? theme.textSecondary : theme.text, textDecorationLine: plan.completed ? 'line-through' : 'none' },
          ]}>
          {plan.name}
        </Text>
        <View style={styles.metaRow}>
          <ClockIcon size={12} color={theme.textSecondary} strokeWidth={2} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{fmtTime12(plan.time)}</Text>
          {plan.live && <Text style={[styles.metaText, styles.metaBold, { color: theme.success }]}> · Live</Text>}
          {plan.alert !== 'none' && <Text style={[styles.metaText, { color: theme.textSecondary }]}> · Alert</Text>}
          {group && <Text style={[styles.metaText, styles.metaBold, { color: group.color }]}> · {group.name}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 12.5, fontWeight: '500' },
  metaBold: { fontWeight: '700' },
});
