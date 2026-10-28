import { Tabs } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddPlanFab, TabBar } from '@/components/tab-bar';
import { t } from '@/i18n';

// New Plan floats only where plans are listed; on Progress and Profile it just covered row values.
const FAB_ROUTES = new Set(['index', 'calendar']);

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
