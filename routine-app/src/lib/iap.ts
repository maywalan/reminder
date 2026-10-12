import * as Localization from 'expo-localization';
import { fetchProducts, getActiveSubscriptions, getAvailablePurchases, initConnection, type ActiveSubscription, type Purchase } from 'expo-iap';
import { useEffect, useState } from 'react';

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
function currentPremiumSub(active: ActiveSubscription[]): ActiveSubscription | undefined {
  return active
    .filter((s) => s.isActive && subscriptionStateForSku(s.productId))
    .sort((a, b) => b.transactionDate - a.transactionDate)[0];
}

export function deriveSubscriptionState(active: ActiveSubscription[], purchases: Purchase[]): SubscriptionState {
  const sub = currentPremiumSub(active);
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
    const sub = currentPremiumSub(active ?? []);
    store.setSubscriptionDetails(
      sub ? { productId: sub.productId, periodStart: sub.transactionDate, expiresAt: sub.expirationDateIOS ?? null } : null
    );
  } catch {
    // Offline or StoreKit unavailable — keep the last known state.
  }
}

export type Billing = 'monthly' | 'annual';

/** Premium prices as the App Store storefront sells them, or the fallback below until StoreKit answers. */
export interface PremiumPrices {
  currency: string;
  amount: Record<Billing, number>;
  /** StoreKit's own formatted price ("$2.69", "฿89.00"); the fallback is formatted locally. */
  display: Record<Billing, string>;
  /** A StoreKit price string to copy the currency format from; undefined for the fallback. */
  like?: string;
  fromStore: boolean;
}

// Same as Tickle.storekit / the paywall design handoff. Shown only while StoreKit hasn't returned
// products (offline, or a build not launched from Xcode in the Simulator).
const FALLBACK_AMOUNTS: Record<'USD' | 'THB', Record<Billing, number>> = {
  USD: { monthly: 2.69, annual: 16.99 },
  THB: { monthly: 89, annual: 555 },
};

/**
 * Formats a derived amount (annual ÷ 12, $0) in the storefront's currency. With a StoreKit
 * `displayPrice` as `like`, its symbol and separators are reused ("฿555.00" → "฿46.25") so it
 * matches the real prices next to it; otherwise the device locale formats it.
 */
export function formatPrice(amount: number, currency: string, like?: string): string {
  // Whole amounts drop the decimals ("$0", "฿89"); anything else keeps two ("$1.42").
  const digits = Number.isInteger(amount) ? 0 : 2;
  const num = like?.match(/\d(?:[\d.,\s\u00a0\u202f]*\d)?/);
  if (like && num) {
    const decimalComma = /,\d{2}$/.test(num[0]);
    const text = amount.toFixed(digits).replace('.', decimalComma ? ',' : '.');
    return like.replace(num[0], text);
  }
  try {
    return new Intl.NumberFormat(Localization.getLocales()[0]?.languageTag ?? 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}

function fallbackPrices(): PremiumPrices {
  const currency = Localization.getLocales()[0]?.regionCode === 'TH' ? 'THB' : 'USD';
  const amount = FALLBACK_AMOUNTS[currency];
  return {
    currency,
    amount,
    display: { monthly: formatPrice(amount.monthly, currency), annual: formatPrice(amount.annual, currency) },
    fromStore: false,
  };
}

let cachedPrices: PremiumPrices | null = null;

/** Reads both Premium products from StoreKit. Null if either is missing or the store can't be reached. */
export async function loadPremiumPrices(): Promise<PremiumPrices | null> {
  try {
    if (!(await initConnection())) return null;
    const products = (await fetchProducts({ skus: PREMIUM_SKU_LIST, type: 'subs' })) ?? [];
    const find = (sku: string) => products.find((p) => 'id' in p && p.id === sku);
    const monthly = find(PREMIUM_SKUS.monthly);
    const annual = find(PREMIUM_SKUS.annual);
    if (!monthly || !annual || monthly.price == null || annual.price == null) return null;
    cachedPrices = {
      currency: monthly.currency,
      amount: { monthly: monthly.price, annual: annual.price },
      display: { monthly: monthly.displayPrice, annual: annual.displayPrice },
      like: annual.displayPrice,
      fromStore: true,
    };
    return cachedPrices;
  } catch {
    return null;
  }
}

/** Storefront prices for the paywall and Subscription screen; the fallback renders until they load. */
export function usePremiumPrices(): PremiumPrices {
  const [prices, setPrices] = useState<PremiumPrices>(() => cachedPrices ?? fallbackPrices());
  useEffect(() => {
    let alive = true;
    loadPremiumPrices().then((p) => {
      if (alive && p) setPrices(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return prices;
}

/** "SAVE 47%" — annual vs twelve months of monthly. */
export function annualSavingsPct(prices: PremiumPrices): number {
  const yearOfMonthly = prices.amount.monthly * 12;
  return yearOfMonthly > 0 ? Math.round((1 - prices.amount.annual / yearOfMonthly) * 100) : 0;
}
