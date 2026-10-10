import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { t } from '@/i18n';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('tab.home') }} />
      <Tabs.Screen name="calendar" options={{ title: t('tab.calendar') }} />
      <Tabs.Screen name="progress" options={{ title: t('tab.progress') }} />
      <Tabs.Screen name="profile" options={{ title: t('tab.profile') }} />
    </Tabs>
  );
}
