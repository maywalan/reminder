import { Platform } from 'react-native';

import { PREMIUM_SKUS } from '@/lib/iap';
import type { SubscriptionDetails, SubscriptionState } from '@/store/types';
import { FREE_ACTIVE_PLAN_LIMIT } from '@/utils/premium';
import { MONTH_SHORT } from '@/utils/progress';

export const SUBSCRIPTION_STATES: SubscriptionState[] = ['trial', 'monthly', 'annual', 'ending', 'free'];

export const SUBSCRIPTION_STATE_LABEL: Record<SubscriptionState, string> = {
  trial: 'Trial',
  monthly: 'Monthly',
  annual: 'Annual',
  ending: 'Ending',
  free: 'Free',
};

export interface SubscriptionContent {
  pillLabel: string;
  pillBg: string;
  pillInk: string;
  dark: boolean;
  planName: string;
  priceLine: string;
  meterLabel: string;
  meterValue: string;
  pct: number;
  barColor: string;
  billPlan: string;
  billNext: string;
  billPay: string;
  ctaLabel: string;
  ctaAction: 'store' | 'paywall';
  minorLabel: string;
  minorInk: string;
  minorAction: 'store' | 'ending-info' | 'restore';
  listTitle: string;
  listGrey: boolean;
}

type Billing = 'monthly' | 'annual';

const DAY_MS = 86_400_000;
const TRIAL_DAYS = 7;
// Same fallback USD prices as the paywall's PRICE table (Tickle.storekit's displayPrice).
const PRICE_USD: Record<Billing, number> = { monthly: 2.69, annual: 16.99 };
const BILLED_BY = Platform.OS === 'android' ? 'Google Play' : 'App Store';

const usd = (n: number) => `$${n.toFixed(2)}`;

function fmtDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function addPeriod(ms: number, billing: Billing) {
  const d = new Date(ms);
  if (billing === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export interface SubscriptionInputs {
  /** From the last StoreKit refresh; null on Free or while a Profile > Testing state is forced. */
  details: SubscriptionDetails | null;
  activePlans: number;
  now?: number;
}

/**
 * Where the current period starts/ends and which billing it's on. Real StoreKit dates when we
 * have them; otherwise (a forced testing state) plausible dates relative to today, so the screen
 * never shows a stale hardcoded date.
 */
function resolvePeriod(state: SubscriptionState, details: SubscriptionDetails | null, now: number) {
  const billing: Billing =
    details?.productId === PREMIUM_SKUS.annual ? 'annual'
    : details?.productId === PREMIUM_SKUS.monthly ? 'monthly'
    : state === 'annual' || state === 'trial' ? 'annual'
    : 'monthly';
  if (details) {
    const end = details.expiresAt ?? (state === 'trial' ? details.periodStart + TRIAL_DAYS * DAY_MS : addPeriod(details.periodStart, billing));
    return { billing, start: details.periodStart, end };
  }
  const start = now - (state === 'trial' ? 2 : state === 'ending' ? 26 : 10) * DAY_MS;
  const end = state === 'trial' ? start + TRIAL_DAYS * DAY_MS : addPeriod(start, billing);
  return { billing, start, end };
}

/**
 * Content per entitlement state (design_handoff_tickle_subscription/README.md's state table),
 * filled from StoreKit's dates. Prices are still the fixed USD fallback until the paywall reads
 * localized prices from StoreKit.
 */
export function getSubscriptionContent(state: SubscriptionState, { details, activePlans, now = Date.now() }: SubscriptionInputs): SubscriptionContent {
  const { billing, start, end } = resolvePeriod(state, details, now);
  const daysLeft = Math.max(0, Math.ceil((end - now) / DAY_MS));
  const elapsedPct = Math.min(100, Math.max(0, ((now - start) / Math.max(1, end - start)) * 100));
  const planName = billing === 'annual' ? 'Premium — Annual' : 'Premium — Monthly';
  const billPlan = billing === 'annual' ? 'Premium annual' : 'Premium monthly';
  const daysLabel = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;

  switch (state) {
    case 'trial': {
      const day = Math.min(TRIAL_DAYS, Math.max(1, Math.floor((now - start) / DAY_MS) + 1));
      return {
        pillLabel: `TRIAL · ${daysLabel.toUpperCase()}`,
        pillBg: '#1B76E8',
        pillInk: '#fff',
        dark: true,
        planName,
        priceLine: `${usd(PRICE_USD[billing])} / ${billing === 'annual' ? 'yr' : 'month'} after trial`,
        meterLabel: `Trial ends ${fmtDate(end)}`,
        meterValue: `day ${day} of ${TRIAL_DAYS}`,
        pct: elapsedPct,
        barColor: '#1B76E8',
        billPlan,
        billNext: fmtDate(end),
        billPay: BILLED_BY,
        ctaLabel: 'Manage subscription',
        ctaAction: 'store',
        minorLabel: 'Cancel trial',
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    }
    case 'monthly':
      return {
        pillLabel: 'ACTIVE',
        pillBg: 'rgba(79,216,164,0.2)',
        pillInk: '#8FEAC4',
        dark: true,
        planName: 'Premium — Monthly',
        priceLine: `${usd(PRICE_USD.monthly)} / month`,
        meterLabel: `Renews ${fmtDate(end)}`,
        meterValue: `${usd(PRICE_USD.monthly * 12)} / yr at this rate`,
        pct: 100,
        barColor: '#1B76E8',
        billPlan: 'Premium monthly',
        billNext: fmtDate(end),
        billPay: BILLED_BY,
        ctaLabel: 'Switch to annual · save 48%',
        ctaAction: 'paywall',
        minorLabel: 'Cancel subscription',
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    case 'annual':
      return {
        pillLabel: 'ACTIVE',
        pillBg: 'rgba(79,216,164,0.2)',
        pillInk: '#8FEAC4',
        dark: true,
        planName: 'Premium — Annual',
        priceLine: `${usd(PRICE_USD.annual)} / yr (≈ ${usd(PRICE_USD.annual / 12)}/mo)`,
        meterLabel: `Renews ${fmtDate(end)}`,
        meterValue: `≈ ${usd(PRICE_USD.annual / 12)} / mo`,
        pct: 100,
        barColor: '#1B76E8',
        billPlan: 'Premium annual',
        billNext: fmtDate(end),
        billPay: BILLED_BY,
        ctaLabel: 'Manage subscription',
        ctaAction: 'store',
        minorLabel: 'Cancel subscription',
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    case 'ending': {
      const endDate = new Date(end);
      return {
        pillLabel: `ENDS ${endDate.getDate()} ${MONTH_SHORT[endDate.getMonth()].toUpperCase()}`,
        pillBg: 'rgba(184,134,43,0.22)',
        pillInk: '#EFC985',
        dark: true,
        planName,
        priceLine: 'Cancelled · no further charges',
        meterLabel: `Premium until ${fmtDate(end)}, then Free`,
        meterValue: daysLabel,
        // Drains toward the end date.
        pct: 100 - elapsedPct,
        barColor: '#D9A356',
        billPlan,
        billNext: '—',
        billPay: BILLED_BY,
        ctaLabel: 'Keep Premium',
        ctaAction: 'store',
        minorLabel: 'What changes on Free?',
        minorInk: '#0F5FC4',
        minorAction: 'ending-info',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    }
    case 'free':
    default: {
      const atLimit = activePlans >= FREE_ACTIVE_PLAN_LIMIT;
      return {
        pillLabel: 'FREE PLAN',
        pillBg: '#EEF3FA',
        pillInk: '#3A4759',
        dark: false,
        planName: 'Free',
        priceLine: '$0 forever',
        meterLabel: 'Active plans used',
        meterValue: `${Math.min(activePlans, FREE_ACTIVE_PLAN_LIMIT)} of ${FREE_ACTIVE_PLAN_LIMIT}`,
        pct: Math.min(100, (activePlans / FREE_ACTIVE_PLAN_LIMIT) * 100),
        barColor: atLimit ? '#D9A356' : '#1B76E8',
        billPlan: 'Free',
        billNext: '—',
        billPay: '—',
        ctaLabel: 'Start free trial',
        ctaAction: 'paywall',
        minorLabel: 'Restore purchases',
        minorInk: '#5A6A80',
        minorAction: 'restore',
        listTitle: 'Unlock with Premium',
        listGrey: true,
      };
    }
  }
}
