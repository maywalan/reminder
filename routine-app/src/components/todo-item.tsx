import { useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderlessButton, RectButton, Swipeable } from 'react-native-gesture-handler';

import { CheckIcon, ClockIcon, TrashIcon } from '@/components/icon';
import { Fonts, Radii, RowMinHeight, Typography } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { useTheme } from '@/hooks/use-theme';
import { secondsUntilPlan } from '@/utils/countdown';
import { fmtTime12 } from '@/utils/dates';

interface Props {
  plan: Plan;
  group: Group | undefined;
  selectMode: boolean;
  selected: boolean;
  isActive?: boolean;
  /** Short date prefix (e.g. "Mon, Aug 24") shown before the time — for lists spanning more than one day. */
  dateLabel?: string;
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
  dateLabel,
  onToggleComplete,
  onToggleSelect,
  onPress,
  onDelete,
  onDrag,
}: Props) {
  const theme = useTheme();
  const taskColor = plan.color || group?.color || theme.accent;
  const overdue = !plan.completed && !selectMode && !plan.allDay && secondsUntilPlan(plan) < 0;

  const checkBg = selectMode ? (selected ? theme.accent : theme.surface) : plan.completed ? theme.accent : theme.surface;
  const checkBorder = selectMode ? (selected ? theme.accent : theme.textFaint) : plan.completed ? theme.accent : theme.textFaint;

  // Completing a task washes the row in its color from the left edge, then fades that wash away
  // to reveal the (now-completed) row underneath — only on the incomplete -> complete transition.
  // Both legs animate only `transform`/`opacity`, so they run entirely on the native UI thread
  // (useNativeDriver: true) at the device's own display refresh rate, independent of JS-thread
  // load. The actual `onToggleComplete()` store write — which can re-sort/re-render the whole
  // list — is deliberately deferred until the wash is fully opaque, so that work happens while
  // the row is completely covered instead of popping visibly mid-sweep.
  const completeFillScale = useRef(new Animated.Value(0)).current;
  const completeFillOpacity = useRef(new Animated.Value(1)).current;

  function handleToggleComplete() {
    if (plan.completed) {
      onToggleComplete();
      return;
    }
    completeFillScale.setValue(0);
    completeFillOpacity.setValue(1);
    Animated.timing(completeFillScale, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onToggleComplete();
      Animated.timing(completeFillOpacity, { toValue: 0, duration: 320, delay: 180, useNativeDriver: true }).start();
    });
  }

  const rowContent = (
    <>
      <BorderlessButton
        onPress={selectMode ? onToggleSelect : handleToggleComplete}
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
          <ClockIcon size={12} color={overdue ? theme.due : theme.textSecondary} strokeWidth={2} />
          <Text style={[styles.metaText, { color: overdue ? theme.due : theme.textSecondary }]}>
            {dateLabel ? `${dateLabel} · ` : ''}
            {plan.allDay ? 'All Day' : plan.endTime ? `${fmtTime12(plan.time)} – ${fmtTime12(plan.endTime)}` : fmtTime12(plan.time)}
          </Text>
          {plan.live && <Text style={[styles.metaText, styles.metaBold, { color: theme.successLive }]}> · Live</Text>}
          {plan.alerts.length > 0 && (
            <Text style={[styles.metaText, { color: overdue ? theme.due : theme.textSecondary }]}>
              {' '}
              · {plan.alerts.length > 1 ? `${plan.alerts.length} Alerts` : 'Alert'}
            </Text>
          )}
          {group && <Text style={[styles.metaText, styles.metaBold, { color: group.color }]}> · {group.name}</Text>}
        </View>
      </View>

      <View pointerEvents="none" style={styles.completeFillClip}>
        <Animated.View
          style={[
            styles.completeFill,
            {
              backgroundColor: taskColor,
              opacity: completeFillOpacity,
              transform: [{ scaleX: completeFillScale }],
            },
          ]}
        />
      </View>
    </>
  );

  const rowStyle = [
    styles.row,
    {
      backgroundColor: theme.surface,
      borderColor: theme.cardBorder,
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
    minHeight: RowMinHeight,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  rowActive: {
    shadowColor: '#10203A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  deleteAction: {
    width: 72,
    marginRight: 16,
    marginBottom: 10,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Clips the fill to the row's exact rounded rect — without this, a thin, heavily-scaled-down
  // sliver at the start of the scaleX animation renders its own borderRadius poorly and visibly
  // pokes past the row's corner instead of following it. Extended past the padding edge by the
  // row's own border widths (1 on top/right/bottom, 4 on the accent-colored left) so the fill
  // starts flush with that left border instead of a few px to the right of it — reads as the
  // border itself expanding rather than a separate wash appearing mid-row.
  completeFillClip: {
    position: 'absolute',
    top: -1,
    right: -1,
    bottom: -1,
    left: -4,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  completeFill: {
    ...StyleSheet.absoluteFillObject,
    transformOrigin: 'left',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: Typography.rowLabel, fontWeight: '600', fontFamily: Fonts[600], marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: Typography.label, fontWeight: '500', fontFamily: Fonts[500] },
  metaBold: { fontWeight: '700', fontFamily: Fonts[700] },
});
