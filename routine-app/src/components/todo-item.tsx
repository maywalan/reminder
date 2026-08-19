import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderlessButton, RectButton, Swipeable } from 'react-native-gesture-handler';

import { CheckIcon, ClockIcon, TrashIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { useTheme } from '@/hooks/use-theme';
import { fmtTime12 } from '@/utils/dates';

interface Props {
  plan: Plan;
  group: Group | undefined;
  selectMode: boolean;
  selected: boolean;
  isActive?: boolean;
  onToggleComplete: () => void;
  onToggleSelect: () => void;
  onPress: () => void;
  onDelete: () => void;
  onDrag: () => void;
}

export function TodoItem({
  plan,
  group,
  selectMode,
  selected,
  isActive,
  onToggleComplete,
  onToggleSelect,
  onPress,
  onDelete,
  onDrag,
}: Props) {
  const theme = useTheme();
  const taskColor = plan.color || group?.color || theme.accent;

  const checkBg = selectMode ? (selected ? theme.accent : theme.surface) : plan.completed ? theme.success : theme.surface;
  const checkBorder = selectMode ? (selected ? theme.accent : theme.dividerStrong) : plan.completed ? theme.success : theme.dividerStrong;

  const rowContent = (
    <>
      <BorderlessButton
        onPress={selectMode ? onToggleSelect : onToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.check, { backgroundColor: checkBg, borderColor: checkBorder }]}>
        {!selectMode && plan.completed && <CheckIcon size={13} color="#fff" strokeWidth={3} />}
      </BorderlessButton>

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
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {plan.allDay ? 'All Day' : plan.endTime ? `${fmtTime12(plan.time)} – ${fmtTime12(plan.endTime)}` : fmtTime12(plan.time)}
          </Text>
          {plan.live && <Text style={[styles.metaText, styles.metaBold, { color: theme.success }]}> · Live</Text>}
          {plan.alerts.length > 0 && (
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {' '}
              · {plan.alerts.length > 1 ? `${plan.alerts.length} Alerts` : 'Alert'}
            </Text>
          )}
          {group && <Text style={[styles.metaText, styles.metaBold, { color: group.color }]}> · {group.name}</Text>}
        </View>
      </View>
    </>
  );

  const rowStyle = [
    styles.row,
    {
      backgroundColor: theme.surface,
      borderColor: theme.divider,
      borderLeftColor: taskColor,
      opacity: plan.completed ? 0.5 : isActive ? 0.9 : 1,
    },
    isActive && styles.rowActive,
  ];

  function confirmDelete() {
    Alert.alert('Delete Plan?', `"${plan.name}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  if (selectMode) {
    return (
      <RectButton onPress={onToggleSelect} style={rowStyle} rippleColor={theme.divider} underlayColor={theme.divider}>
        {rowContent}
      </RectButton>
    );
  }

  return (
    <Swipeable
      renderRightActions={(_progress, dragX) => {
        const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.4], extrapolate: 'clamp' });
        return (
          <Pressable onPress={confirmDelete} style={[styles.deleteAction, { backgroundColor: theme.danger }]}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <TrashIcon size={20} color="#fff" strokeWidth={2} />
            </Animated.View>
          </Pressable>
        );
      }}
      overshootRight={false}
      rightThreshold={40}>
      <RectButton onPress={onPress} onLongPress={onDrag} style={rowStyle} rippleColor={theme.divider} underlayColor={theme.divider}>
        {rowContent}
      </RectButton>
    </Swipeable>
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
  rowActive: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  deleteAction: {
    width: 72,
    marginRight: 16,
    marginBottom: 10,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  name: { fontSize: Typography.heading, fontWeight: '600', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: Typography.body, fontWeight: '500' },
  metaBold: { fontWeight: '700' },
});
