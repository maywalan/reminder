import type { SubscriptionState } from '@/store/types';

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
