import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, ChartIcon, HomeIcon, PersonIcon, PlusIcon } from '@/components/icon';
import { Radii, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';

const ROUTE_ICONS: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  calendar: CalendarIcon,
  progress: ChartIcon,
  profile: PersonIcon,
};

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
      <Pressable key={route.key} onPress={onPress} style={styles.tabBtn} hitSlop={6}>
        {focused ? (
          <View style={[styles.tabIconTile, { backgroundColor: theme.accentSoft }]}>
            <Icon size={19} color={theme.accent} strokeWidth={1.8} />
          </View>
        ) : (
          <Icon size={20} color={inactiveColor} strokeWidth={1.8} />
        )}
        <Text style={[styles.tabLabel, { color: focused ? theme.accent : inactiveColor, fontWeight: focused ? '600' : '500' }]}>{label}</Text>
      </Pressable>
    );
  });

  const fab = (
    <Pressable key="fab" onPress={() => router.push('/add-plan')} style={styles.fabWrap}>
      <View style={[styles.fabRing, { backgroundColor: theme.navbarBg }]}>
        <LinearGradient colors={[theme.accent, theme.accentLight]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fab}>
          <PlusIcon size={24} color="#fff" strokeWidth={2.4} />
        </LinearGradient>
      </View>
    </Pressable>
  );

  return (
    <BlurView
      intensity={8}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: theme.divider, backgroundColor: theme.navbarBg },
      ]}>
      <Animated.View
        style={[styles.row, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        pointerEvents={selectMode ? 'none' : 'auto'}>
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
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 16, paddingTop: 12, paddingBottom: 8 },
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
  selectAction: { fontSize: Typography.rowLabel, fontWeight: '700' },
  tabBtn: { width: 60, alignItems: 'center', gap: 4, paddingVertical: 2 },
  tabIconTile: { width: 30, height: 30, borderRadius: Radii.iconTile, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  tabLabel: { fontSize: Typography.tabLabel },
  fabWrap: { marginTop: -26 },
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
