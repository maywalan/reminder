import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { syncWidgetData } from '@/lib/widget-sync';
import { usePlannerStore } from '@/store/use-planner-store';

/**
 * Keeps the iOS Home Screen widget's shared App Group data in sync with the store. Mounted once
 * at the root layout, mirroring useNotificationsSync's debounce/foreground-refresh pattern —
 * "today's plans" also goes stale at midnight if the app isn't reopened.
 */
export function useWidgetSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function sync() {
      const { plans, groups } = usePlannerStore.getState();
      syncWidgetData(plans, groups);
    }

    function scheduleSync() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(sync, 400);
    }

    scheduleSync();

    const unsubscribe = usePlannerStore.subscribe((state, prevState) => {
      if (state.plans !== prevState.plans || state.groups !== prevState.groups) {
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
