import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshSubscriptionState } from '@/lib/iap';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * Keeps the Premium entitlement current: re-checks StoreKit at launch and whenever the app comes
 * back to the foreground, so a cancelled or lapsed subscription drops the user back to Free
 * without them having to open the Paywall or Subscription screen. Mounted once at the root layout.
 * Also re-checks when the signed-in account changes, so a tester's Subscription State override
 * is dropped as soon as they sign out.
 */
export function useSubscriptionSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => !s.initializing);
  // Runs at launch too (first render), and once the saved session has loaded.
  useEffect(() => {
    refreshSubscriptionState();
  }, [userId, authReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshSubscriptionState();
    });
    return () => sub.remove();
  }, []);
}
