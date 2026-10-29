import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { BorderlessButton, RectButton, Swipeable } from 'react-native-gesture-handler';

import { Text } from '@/components/text';
import { CheckIcon, ClockIcon, GripIcon, PlanIcon, TrashIcon } from '@/components/icon';
import { Fonts, Radii, RowMinHeight, Typography } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { isMissedToday } from '@/utils/home-feed';
import { resolvePlanIcon } from '@/utils/plan-icons';
import { toISO } from '@/utils/dates';
import { confirmPlanDelete } from '@/utils/repeat-scope';
import { t } from '@/i18n';
import { fmtTime, fmtTimeRange } from '@/i18n/format';

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
  /** Deletes this occurrence and the later ones of a repeating series; offered only when given. */
  onDeleteSeries?: () => void;
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
  onDeleteSeries,
  onDrag,
}: Props) {
  const theme = useTheme();
  const taskColor = plan.color || group?.color || theme.accent;
  const dark = useEffectiveScheme() === 'dark';
  const icon = resolvePlanIcon(plan);
  // Missed by Home's rule (a day already gone, or past its end plus grace today), shown in rose.
  const todayISO = toISO(new Date());
  const missed = !plan.completed && !selectMode && (plan.date < todayISO || (plan.date === todayISO && isMissedToday(plan, Date.now())));
  const metaColor = missed ? theme.danger : theme.textSecondary;
  const when = plan.allDay ? t('common.allDay') : plan.endTime ? fmtTimeRange(plan.time, plan.endTime) : fmtTime(plan.time);

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

  // Lift the row with a spring scale-up (plus the shadow already in rowActive below) the moment
  // a drag picks it up, and spring it back down on drop — with a matching haptic tick on each
  // edge. Native-driven (transform only) so it runs on the UI thread independent of the reorder
  // math happening on drop.
  const dragScale = useRef(new Animated.Value(1)).current;
  const wasActive = useRef(false);
  useEffect(() => {
    if (isActive && !wasActive.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(dragScale, { toValue: 1.045, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    } else if (!isActive && wasActive.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(dragScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    }
    wasActive.current = !!isActive;
  }, [isActive, dragScale]);

  function handleToggleComplete() {
    if (plan.completed) {
      onToggleComplete();
      return;
    }
    completeFillScale.setValue(0);
    completeFillOpacity.setValue(1);
    Animated.timing(completeFillScale, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onToggleComplete();
      Animated.timing(completeFillOpacity, { toValue: 0, duration: 260, delay: 150, useNativeDriver: true }).start();
    });
  }

  const rowContent = (
    <>
      {/* Home's card look: a flat wash of the plan's colour, no coloured edge (critique, 2026-10-29). */}
      <View pointerEvents="none" style={[styles.tint, { backgroundColor: `${taskColor}${dark ? '26' : '14'}` }]} />
      <BorderlessButton
        onPress={selectMode ? onToggleSelect : handleToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.check, { backgroundColor: checkBg, borderColor: checkBorder }]}>
        {!selectMode && plan.completed && <CheckIcon size={13} color="#fff" strokeWidth={3} />}
      </BorderlessButton>

      {icon && (
        <View style={[styles.iconChip, { backgroundColor: `${taskColor}1F` }]}>
          <PlanIcon id={icon} size={17} color={taskColor} strokeWidth={1.9} />
        </View>
      )}

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
          <ClockIcon size={12} color={metaColor} strokeWidth={2} />
          <Text style={[styles.metaText, { color: metaColor }]}>
            {dateLabel ? `${dateLabel} · ` : ''}
            {missed ? t('home.missedAt', { time: when }) : when}
          </Text>
          {plan.live && <Text style={[styles.metaText, styles.metaBold, { color: theme.successLive }]}> · {t('todo.live')}</Text>}
          {plan.alerts.length > 0 && (
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {' '}
              · {plan.alerts.length > 1 ? t('plan.alerts', { count: plan.alerts.length }) : t('plan.alert')}
            </Text>
          )}
          {group && <Text style={[styles.metaText, styles.metaBold, { color: group.color }]}> · {group.name}</Text>}
        </View>
      </View>

      {selectMode && (
        <BorderlessButton
          onActiveStateChange={(active) => active && onDrag()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.dragHandle}>
          <GripIcon size={18} color={theme.textFaint} strokeWidth={2} />
        </BorderlessButton>
      )}

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
      borderColor: 'transparent',
      opacity: plan.completed ? 0.5 : isActive ? 0.9 : 1,
    },
    isActive && styles.rowActive,
  ];

  function confirmDelete() {
    if (onDeleteSeries) return confirmPlanDelete(usePlannerStore.getState().plans, plan, onDelete, onDeleteSeries);
    Alert.alert(t('plan.deleteTitle'), t('plan.deleteBody', { name: plan.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: onDelete },
    ]);
  }

  if (selectMode) {
    return (
      <Animated.View style={{ transform: [{ scale: dragScale }] }}>
        <RectButton onPress={onToggleSelect} style={rowStyle} rippleColor={theme.divider} underlayColor={theme.divider}>
          {rowContent}
        </RectButton>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: dragScale }] }}>
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
    </Animated.View>
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
  // row's 1pt border so the fill starts flush with the card's edge.
  completeFillClip: {
    position: 'absolute',
    top: -1,
    right: -1,
    bottom: -1,
    left: -1,
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
  dragHandle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tint: { ...StyleSheet.absoluteFillObject, borderRadius: Radii.card - 1 },
  iconChip: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: Typography.rowLabel, fontWeight: '600', fontFamily: Fonts[600], marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: Typography.label, fontWeight: '500', fontFamily: Fonts[500] },
  metaBold: { fontWeight: '700', fontFamily: Fonts[700] },
});
