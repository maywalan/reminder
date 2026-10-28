import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { Text } from '@/components/text';
import { t } from '@/i18n';
import { CalendarIcon, ChartIcon, HomeIcon, PersonIcon, PlusIcon } from '@/components/icon';
import { Colors, Fonts, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { confirmSelectedDelete } from '@/utils/repeat-scope';

const ROUTE_ICONS: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  calendar: CalendarIcon,
  progress: ChartIcon,
  profile: PersonIcon,
};

// The pill springs to the tapped tab (user wants springy, not stiff, motion).
const PILL_SPRING = { damping: 17, stiffness: 230, mass: 0.9 };
// Labels grow with Dynamic Type only this far, so they stay on one line in their lane (iOS's own
// tab bar caps them the same way); critique 2026-10-29 found "Hom/e" at accessibility sizes.
const LABEL_MAX_SCALE = 1.3;
const ICON_SIZE = 23;
const PILL_H_PAD = 13;
const PILL_V_PAD = 6;
const PILL_WIDTH = ICON_SIZE + PILL_H_PAD * 2;
const PILL_HEIGHT = ICON_SIZE + PILL_V_PAD * 2;

export function TabBar({
  state,
  descriptors,
  navigation,
  onHeight,
  onRouteChange,
}: BottomTabBarProps & { onHeight?: (height: number) => void; onRouteChange?: (name: string) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const plans = usePlannerStore((s) => s.plans);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const selectAll = usePlannerStore((s) => s.selectAll);
  const setSelectMode = usePlannerStore((s) => s.setSelectMode);
  const deleteSelected = usePlannerStore((s) => s.deleteSelected);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: selectMode ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [selectMode, fade]);

  // Repeating plans in the selection get the "selected only / also future" choice.
  function handleDelete() {
    confirmSelectedDelete(plans, selectedIds, () => deleteSelected(), () => deleteSelected(true));
  }

  // One accent pill slides/morphs behind the icons to whichever tab is tapped, instead of each tab
  // instantly toggling its own background. tabLayouts holds each tab button's measured x/width
  // within `row` (from onLayout — depends on the centered, FAB-interrupted layout, so it can't be
  // computed ahead of time). Early layout passes can report a transient position before the row
  // settles, so any layout update for the CURRENTLY focused tab keeps silently re-snapping the pill
  // (no animation) rather than locking in after the first one — only an actual tab change animates.
  const focusedIndex = state.index;
  const focusedName = state.routes[focusedIndex].name;
  useEffect(() => {
    onRouteChange?.(focusedName);
  }, [focusedName, onRouteChange]);
  const tabLayouts = useRef<(LayoutRectangle | null)[]>([null, null, null, null]).current;
  const pillReady = useRef(false);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  function pillTargetX(layout: LayoutRectangle) {
    return layout.x + (layout.width - PILL_WIDTH) / 2;
  }

  function applyPillPosition(layout: LayoutRectangle, animate: boolean) {
    const targetX = pillTargetX(layout);
    if (animate && !reduceMotion) {
      Animated.spring(pillX, { toValue: targetX, ...PILL_SPRING, useNativeDriver: true }).start();
    } else {
      pillX.setValue(targetX);
    }
    if (!pillReady.current) {
      pillReady.current = true;
      Animated.timing(pillOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  }

  function handleTabLayout(index: number, layout: LayoutRectangle) {
    tabLayouts[index] = layout;
    if (index === focusedIndex) applyPillPosition(layout, false);
  }

  useEffect(() => {
    const layout = tabLayouts[focusedIndex];
    if (!layout) return; // not measured yet — handleTabLayout will place it once its own layout arrives
    applyPillPosition(layout, pillReady.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex]);

  // The bar holds the four sections only; New Plan floats above it (AddPlanFab), since a tab bar
  // is for places, not actions (critique, 2026-10-29).
  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const focused = state.index === index;
    const Icon = ROUTE_ICONS[route.name] ?? HomeIcon;

    // Tapping the focused tab again emits tabPress too; screens' useScrollToTop scrolls them up.
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        Haptics.selectionAsync();
        navigation.navigate(route.name);
      }
    };

    return (
      <BouncyPressable
        key={route.key}
        onPress={onPress}
        onLayout={(e) => handleTabLayout(index, e.nativeEvent.layout)}
        pressedScale={0.9}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        style={styles.tabBtn}>
        <View style={styles.tabIconSlot}>
          <Icon size={ICON_SIZE} color={focused ? theme.accent : theme.tabInactive} strokeWidth={focused ? 1.9 : 1.8} />
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={LABEL_MAX_SCALE}
          style={[
            styles.tabLabel,
            { color: focused ? theme.accentStrong : theme.tabInactive, fontWeight: focused ? '600' : '500', fontFamily: focused ? Fonts[600] : Fonts[500] },
          ]}>
          {label}
        </Text>
      </BouncyPressable>
    );
  });

  return (
    <View
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: theme.divider, backgroundColor: theme.surface }]}>
      <Animated.View
        accessibilityRole="tabbar"
        style={[styles.row, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        pointerEvents={selectMode ? 'none' : 'auto'}>
        <Animated.View
          pointerEvents="none"
          style={[styles.slidingPill, { backgroundColor: theme.accentSoft, opacity: pillOpacity, transform: [{ translateX: pillX }] }]}
        />
        {items}
      </Animated.View>

      <Animated.View
        style={[styles.selectRow, { opacity: fade }]}
        pointerEvents={selectMode ? 'auto' : 'none'}>
        <View style={styles.selectSlot}>
          <Pressable onPress={selectAll} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.selectAction, { color: theme.accent }]}>{t('common.selectAll')}</Text>
          </Pressable>
        </View>
        {/* Leave Edit mode from here too; its other exit is up on the Today card (critique, 2026-10-29). */}
        <View style={[styles.selectSlot, styles.selectSlotCenter]}>
          <Pressable onPress={() => setSelectMode(false)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.selectAction, { color: theme.accentStrong }]}>{t('common.done')}</Text>
          </Pressable>
        </View>
        <View style={[styles.selectSlot, styles.selectSlotEnd]}>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            disabled={selectedIds.length === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedIds.length === 0 }}>
            <Text style={[styles.selectAction, { color: theme.danger, opacity: selectedIds.length === 0 ? 0.4 : 1 }]}>
              {selectedIds.length > 0 ? t('plans.deleteCount', { count: selectedIds.length }) : t('common.delete')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A hairline alone separates the bar; the upward shadow stacked with Home's bottom fade into a
  // grey smudge (critique, 2026-10-29).
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  // Four equal lanes across the bar, like the system tab bar.
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8 },
  selectRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Three equal slots so Done sits at the true centre whatever the side labels' widths.
  selectSlot: { flex: 1, alignItems: 'flex-start' },
  selectSlotCenter: { alignItems: 'center' },
  selectSlotEnd: { alignItems: 'flex-end' },
  selectAction: { fontSize: Typography.rowLabel, fontWeight: '700', fontFamily: Fonts[700] },
  tabBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  tabIconSlot: { paddingHorizontal: PILL_H_PAD, paddingVertical: PILL_V_PAD, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  // The one traveling pill that slides/morphs behind whichever tab is focused — sized and offset to
  // land exactly under tabIconSlot's content box. `top` = row's own paddingTop (12) + tabBtn's
  // paddingVertical (2): absolutely positioned children measure `top` from the parent's border edge,
  // not its padding edge, so row's paddingTop has to be added back in explicitly or the pill sits
  // too high relative to tabBtn's normal-flow content (which does get pushed down by that padding).
  slidingPill: { position: 'absolute', top: 14, left: 0, width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: Radii.chip },
  // 11.5pt, up from the 9.5pt tabLabel token: that sat under iOS's 11pt floor (critique, 2026-10-29).
  tabLabel: { fontSize: 11.5 },
  // right: 20 lines the button up with Home's card edge (FEED_INSET).
  fabWrap: { position: 'absolute', right: 20 },
  // Full circle, matching every in-screen FAB instance in design_handoff_tickle_draft2 (radius:27
  // on a 54pt box) — not the section 08 token-reference swatch, which uses radius 14.
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B76E8',
    shadowOpacity: 0.42,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});

/** Gap between the top of the tab bar and the floating New Plan button. */
const FAB_GAP = 14;

/**
 * New Plan, floating above the tab bar's trailing edge. It sits beside the navigator instead of
 * inside the bar so its whole circle is tappable (iOS doesn't hit-test views that overflow their
 * parent). Hidden while Edit mode's Select All / Delete bar is up.
 */
export function AddPlanFab({ barHeight }: { barHeight: number }) {
  const router = useRouter();
  const selectMode = usePlannerStore((s) => s.selectMode);
  if (!barHeight || selectMode) return null;
  return (
    <BouncyPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/add-plan');
      }}
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={t('tab.newPlan')}
      style={[styles.fabWrap, { bottom: barHeight + FAB_GAP }]}>
      {/* The light theme's azure in both modes: dark mode's paler blues washed out the white plus. */}
      <LinearGradient colors={[Colors.light.accent, Colors.light.accentLight]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fab}>
        <PlusIcon size={28} color="#fff" strokeWidth={2.5} />
      </LinearGradient>
    </BouncyPressable>
  );
}
