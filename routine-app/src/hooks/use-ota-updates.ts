import { useEffect } from 'react';
import { AppState } from 'react-native';

/** Only reload right away if the update arrives this soon after launch, before the user is busy. */
const RELOAD_WINDOW_MS = 10_000;

/**
 * EAS Update: by default a downloaded update only runs on the *next* cold start, so testers who
 * opened the app once kept seeing old code. At launch this checks, downloads and reloads straight
 * away (only within the first few seconds); when the app comes back to the foreground it just
 * downloads, and the update applies on the next launch. Release builds only. expo-updates is
 * imported lazily so dev builds made before it was added don't crash on the missing native module.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__) return;
    const launchedAt = Date.now();

    async function check(reloadIfFresh: boolean) {
      try {
        const Updates = await import('expo-updates');
        if (!Updates.isEnabled) return;
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        const { isNew } = await Updates.fetchUpdateAsync();
        if (isNew && reloadIfFresh && Date.now() - launchedAt < RELOAD_WINDOW_MS) await Updates.reloadAsync();
      } catch {
        // Offline or the update server is unreachable: try again next time.
      }
    }

    check(true);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check(false);
    });
    return () => sub.remove();
  }, []);
}
