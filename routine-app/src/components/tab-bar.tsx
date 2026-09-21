import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, ChartIcon, HomeIcon, PersonIcon, PlusIcon } from '@/components/icon';
import { Fonts, Radii, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';

const ROUTE_ICONS: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  calendar: CalendarIcon,
  progress: ChartIcon,
  profile: PersonIcon,
};

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const ICON_SIZE = 23;
const PILL_H_PAD = 13;
const PILL_V_PAD = 6;
const PILL_WIDTH = ICON_SIZE + PILL_H_PAD * 2;
const PILL_HEIGHT = ICON_SIZE + PILL_V_PAD * 2;

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const scheme = useEffectiveScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const selectAll = usePlannerStore((s) => s.selectAll);
  const deleteSelected = usePlannerStore((s) => s.deleteSelected);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: selectMode ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [selectMode, fade]);

  function handleDelete() {
    Alert.alert('Delete Plans?', `${selectedIds.length} plan${selectedIds.length === 1 ? '' : 's'} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteSelected },
    ]);
  }

  // One accent pill slides/morphs behind the icons to whichever tab is tapped, instead of each tab
  // instantly toggling its own background. tabLayouts holds each tab button's measured x/width
  // within `row` (from onLayout — depends on the centered, FAB-interrupted layout, so it can't be
  // computed ahead of time). Early layout passes can report a transient position before the row
  // settles, so any layout update for the CURRENTLY focused tab keeps silently re-snapping the pill
  // (no animation) rather than locking in after the first one — only an actual tab change animates.
  const focusedIndex = state.index;
  const tabLayouts = useRef<(LayoutRectangle | null)[]>([null, null, null, null]).current;
  const pillReady = useRef(false);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  function pillTargetX(layout: LayoutRectangle) {
    return layout.x + (layout.width - PILL_WIDTH) / 2;
  }

  function applyPillPosition(layout: LayoutRectangle, animate: boolean) {
    const targetX = pillTargetX(layout);
    if (animate) {
      Animated.timing(pillX, { toValue: targetX, duration: 320, easing: EASE, useNativeDriver: true }).start();
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

  // Prototype order: Today, Calendar, [FAB], Progress, Profile — the FAB is not a route,
  // it's inserted visually between the 2nd and 3rd tab.
  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const focused = state.index === index;
    const Icon = ROUTE_ICONS[route.name] ?? HomeIcon;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    const inactiveColor = scheme === 'dark' ? theme.textSecondary : theme.textQuaternary;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLayout={(e) => handleTabLayout(index, e.nativeEvent.layout)}
        style={styles.tabBtn}
        hitSlop={6}>
        <View style={styles.tabIconSlot}>
          <Icon size={ICON_SIZE} color={focused ? theme.accent : inactiveColor} strokeWidth={focused ? 1.9 : 1.8} />
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: focused ? theme.accentStrong : inactiveColor, fontWeight: focused ? '600' : '500', fontFamily: focused ? Fonts[600] : Fonts[500] },
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  });

  const fab = (
    <Pressable key="fab" onPress={() => router.push('/add-plan')} style={styles.fabWrap}>
      <View style={[styles.fabRing, { backgroundColor: theme.navbarBg }]}>
        <LinearGradient colors={[theme.accent, theme.accentLight]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fab}>
          <PlusIcon size={28} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </View>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: theme.divider, backgroundColor: theme.surface },
      ]}>
      <Animated.View
        style={[styles.row, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        pointerEvents={selectMode ? 'none' : 'auto'}>
        <Animated.View
          pointerEvents="none"
          style={[styles.slidingPill, { backgroundColor: theme.accentSoft, opacity: pillOpacity, transform: [{ translateX: pillX }] }]}
        />
        {items[0]}
        {items[1]}
        {fab}
        {items[2]}
        {items[3]}
      </Animated.View>

      <Animated.View
        style={[styles.selectRow, { opacity: fade }]}
        pointerEvents={selectMode ? 'auto' : 'none'}>
        <Pressable onPress={selectAll} hitSlop={8}>
          <Text style={[styles.selectAction, { color: theme.accent }]}>Select All</Text>
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8} disabled={selectedIds.length === 0}>
          <Text style={[styles.selectAction, { color: theme.danger, opacity: selectedIds.length === 0 ? 0.4 : 1 }]}>Delete</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#10203A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  // Fixed-width lanes with a modest gap, centered — not `space-around`, which stretches the gaps
  // to fill the bar and reads as too far apart on a phone wider than the design's 320pt reference.
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 14, paddingTop: 12, paddingBottom: 8 },
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
  selectAction: { fontSize: Typography.rowLabel, fontWeight: '700', fontFamily: Fonts[700] },
  tabBtn: { width: 60, alignItems: 'center', gap: 4, paddingVertical: 2 },
  tabIconSlot: { paddingHorizontal: PILL_H_PAD, paddingVertical: PILL_V_PAD, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  // The one traveling pill that slides/morphs behind whichever tab is focused — sized and offset to
  // land exactly under tabIconSlot's content box. `top` = row's own paddingTop (12) + tabBtn's
  // paddingVertical (2): absolutely positioned children measure `top` from the parent's border edge,
  // not its padding edge, so row's paddingTop has to be added back in explicitly or the pill sits
  // too high relative to tabBtn's normal-flow content (which does get pushed down by that padding).
  slidingPill: { position: 'absolute', top: 14, left: 0, width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: Radii.chip },
  tabLabel: { fontSize: Typography.tabLabel },
  fabWrap: { marginTop: -26 },
  // Full circle, matching every in-screen FAB instance in design_handoff_tickle_draft2 (radius:27
  // on a 54pt box) — not the section 08 token-reference swatch, which uses radius 14.
  fabRing: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
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
