import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  cancelAllPlanAlerts,
  cancelDailyRecap,
  refreshDailyRecap,
  requestNotificationPermissions,
  rescheduleAllPlanAlerts,
} from '@/lib/notifications';
import { usePlannerStore } from '@/store/use-planner-store';

/**
 * Keeps scheduled local notifications (per-plan alerts + the daily recap) in sync with the
 * store. Mounted once at the root layout. Reschedules on any plan change or relevant settings
 * change, and again whenever the app comes back to the foreground (so a recap scheduled before
 * midnight gets refreshed for the new day once the user is back in the app).
 */
export function useNotificationsSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function sync() {
      const { settings, plans } = usePlannerStore.getState();
      if (!settings.notificationsEnabled) {
        await cancelAllPlanAlerts();
        await cancelDailyRecap();
        return;
      }
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      await rescheduleAllPlanAlerts(plans);
      await refreshDailyRecap(plans, settings);
    }

    function scheduleSync() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(sync, 400);
    }

    scheduleSync();

    const unsubscribe = usePlannerStore.subscribe((state, prevState) => {
      if (
        state.plans !== prevState.plans ||
        state.settings.notificationsEnabled !== prevState.settings.notificationsEnabled ||
        state.settings.recapEnabled !== prevState.settings.recapEnabled ||
        state.settings.recapHour !== prevState.settings.recapHour
      ) {
        scheduleSync();
      }
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') scheduleSync();
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}
