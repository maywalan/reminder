import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, ChartIcon, HomeIcon, PersonIcon, PlusIcon } from '@/components/icon';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';

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

    const inactiveColor = scheme === 'dark' ? theme.textSecondary : theme.textTertiary;

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabBtn} hitSlop={6}>
        <Icon size={27} color={focused ? theme.accent : inactiveColor} strokeWidth={1.8} />
        <Text style={[styles.tabLabel, { color: focused ? theme.accent : inactiveColor }]}>{label}</Text>
      </Pressable>
    );
  });

  const fab = (
    <Pressable key="fab" onPress={() => router.push('/add-plan')} style={styles.fabWrap}>
      <LinearGradient colors={[theme.accent, theme.accentStrong]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.fab}>
        <PlusIcon size={26} color="#fff" strokeWidth={2.4} />
      </LinearGradient>
    </Pressable>
  );

  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 60 : 100}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: theme.divider, backgroundColor: theme.navbarBg },
      ]}>
      <View style={styles.row}>
        {items[0]}
        {items[1]}
        {fab}
        {items[2]}
        {items[3]}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 16, paddingTop: 12, paddingBottom: 8 },
  tabBtn: { width: 60, alignItems: 'center', gap: 5, paddingVertical: 2 },
  tabLabel: { fontSize: 11.5, fontWeight: '600' },
  fabWrap: { marginTop: -30 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B5FEF',
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});
