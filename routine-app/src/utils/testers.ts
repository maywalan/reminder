import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '@/store/use-auth-store';

/**
 * Tester accounts get Profile's TESTING tools (Subscription State, Replay Onboarding, Add Test
 * Reminders) in TestFlight and App Store builds too. The flag is `app_metadata.tester`, which only
 * the server can set (users can't edit app_metadata), so nobody can turn it on from the app:
 *
 *   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"tester": true}'
 *   where email = '...';
 *
 * The user must sign out and in again (or wait for the hourly token refresh) to pick it up.
 * Development builds always show the tools.
 */
export function isTester(user: User | null | undefined): boolean {
  return user?.app_metadata?.tester === true;
}

/** Non-reactive check for code outside components (read at call time, not at import). */
export function testToolsAllowed(): boolean {
  return __DEV__ || isTester(useAuthStore.getState().user);
}

/** Reactive version for screens. */
export function useTestToolsAllowed(): boolean {
  const user = useAuthStore((s) => s.user);
  return __DEV__ || isTester(user);
}
