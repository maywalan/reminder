import { getActiveSubscriptions, getAvailablePurchases, initConnection, type ActiveSubscription, type Purchase } from 'expo-iap';

import type { SubscriptionState } from '@/store/types';
import { usePlannerStore } from '@/store/use-planner-store';

/** Matches the products defined in ios-storekit/Tickle.storekit for local Simulator testing. */
export const PREMIUM_SKUS = {
  monthly: 'com.maywalan.tickle.premium.monthly',
  annual: 'com.maywalan.tickle.premium.annual',
} as const;

export const PREMIUM_SKU_LIST = [PREMIUM_SKUS.monthly, PREMIUM_SKUS.annual];

export function subscriptionStateForSku(productId: string): SubscriptionState | null {
  if (productId === PREMIUM_SKUS.monthly) return 'monthly';
  if (productId === PREMIUM_SKUS.annual) return 'annual';
  return null;
}

/**
 * Maps StoreKit's view of the user to one of the Subscription screen's states. No active premium
 * subscription → 'free'. Otherwise: still in the 7-day intro offer → 'trial'; auto-renew turned
 * off (cancelled but paid up until expiry, trial included) → 'ending'; else the plan's billing.
 */
export function deriveSubscriptionState(active: ActiveSubscription[], purchases: Purchase[]): SubscriptionState {
  const sub = active
    .filter((s) => s.isActive && subscriptionStateForSku(s.productId))
    .sort((a, b) => b.transactionDate - a.transactionDate)[0];
  if (!sub) return 'free';
  if (sub.renewalInfoIOS && !sub.renewalInfoIOS.willAutoRenew) return 'ending';
  const latest = purchases
    .filter((p) => p.productId === sub.productId)
    .sort((a, b) => b.transactionDate - a.transactionDate)[0];
  if (latest && 'offerIOS' in latest && latest.offerIOS?.paymentMode === 'free-trial') return 'trial';
  return subscriptionStateForSku(sub.productId) ?? 'free';
}

/**
 * Re-reads the user's entitlement from StoreKit into the planner store. Opens its own connection
 * (the paywall's `useIAP` ends the shared one when it closes). If StoreKit can't be reached the
 * last known state is kept rather than downgrading a paying user. Skipped while a testing
 * override from Profile is on.
 */
export async function refreshSubscriptionState(): Promise<void> {
  try {
    if (!(await initConnection())) return;
    const [active, purchases] = await Promise.all([
      getActiveSubscriptions(PREMIUM_SKU_LIST),
      getAvailablePurchases({ onlyIncludeActiveItemsIOS: true }),
    ]);
    const store = usePlannerStore.getState();
    if (store.subscriptionTestOverride) return;
    store.setMockSubscriptionState(deriveSubscriptionState(active ?? [], purchases ?? []));
  } catch {
    // Offline or StoreKit unavailable — keep the last known state.
  }
}
