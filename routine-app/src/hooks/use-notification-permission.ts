import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getNotificationPermissionStatus } from '@/lib/notifications';

/**
 * Whether iOS has actually granted notification permission. Re-checked whenever the app comes
 * back to the foreground, so a change made in iOS Settings shows up as soon as the user returns.
 * `null` until the first check resolves.
 */
export function useNotificationPermission() {
  const [granted, setGranted] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const { status } = await getNotificationPermissionStatus();
    setGranted(status === 'granted');
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { granted, refresh };
}
