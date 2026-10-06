import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshSubscriptionState } from '@/lib/iap';

/**
 * Keeps the Premium entitlement current: re-checks StoreKit at launch and whenever the app comes
 * back to the foreground, so a cancelled or lapsed subscription drops the user back to Free
 * without them having to open the Paywall or Subscription screen. Mounted once at the root layout.
 */
export function useSubscriptionSync() {
  useEffect(() => {
    refreshSubscriptionState();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshSubscriptionState();
    });
    return () => sub.remove();
  }, []);
}
