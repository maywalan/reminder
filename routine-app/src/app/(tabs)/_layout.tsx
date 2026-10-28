import { Tabs } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddPlanFab, TabBar } from '@/components/tab-bar';
import { t } from '@/i18n';

// New Plan floats on Home only: on Stats and Profile it covered row values, and Calendar has its
// own + on the selected day (critique, 2026-10-29).
const FAB_ROUTES = new Set(['index']);

export default function TabsLayout() {
  // The floating New Plan button sits a fixed gap above the bar, whose height varies with the
  // home-indicator inset and text size, so the bar reports it (and which tab is open).
  const [barHeight, setBarHeight] = useState(0);
  const [route, setRoute] = useState('index');
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} onHeight={setBarHeight} onRouteChange={setRoute} />}>
        <Tabs.Screen name="index" options={{ title: t('tab.home') }} />
        <Tabs.Screen name="calendar" options={{ title: t('tab.calendar') }} />
        <Tabs.Screen name="progress" options={{ title: t('tab.progress') }} />
        <Tabs.Screen name="profile" options={{ title: t('tab.profile') }} />
      </Tabs>
      {FAB_ROUTES.has(route) && <AddPlanFab barHeight={barHeight} />}
    </View>
  );
}
