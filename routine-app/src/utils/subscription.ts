import { Platform } from 'react-native';

import { PREMIUM_SKUS } from '@/lib/iap';
import type { SubscriptionDetails, SubscriptionState } from '@/store/types';
import { FREE_ACTIVE_PLAN_LIMIT } from '@/utils/premium';
import { t } from '@/i18n';
import { fmtDate } from '@/i18n/format';
import type { StringKey } from '@/i18n/strings';

export const SUBSCRIPTION_STATES: SubscriptionState[] = ['trial', 'monthly', 'annual', 'ending', 'free'];

const SUBSCRIPTION_STATE_KEY: Record<SubscriptionState, StringKey> = {
  trial: 'subState.trial',
  monthly: 'subState.monthly',
  annual: 'subState.annual',
  ending: 'subState.ending',
  free: 'subState.free',
};

export const subscriptionStateLabel = (state: SubscriptionState) => t(SUBSCRIPTION_STATE_KEY[state]);

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
const billedBy = () => t(Platform.OS === 'android' ? 'sub.googlePlay' : 'sub.appStore');

const usd = (n: number) => `$${n.toFixed(2)}`;

const fmtDay = (ms: number) => fmtDate(new Date(ms), { year: true }, 'dm');

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
  const planName = t(billing === 'annual' ? 'sub.premiumAnnual' : 'sub.premiumMonthly');
  const billPlan = t(billing === 'annual' ? 'sub.billAnnual' : 'sub.billMonthly');
  const daysLabel = t('sub.daysLeft', { count: daysLeft });

  switch (state) {
    case 'trial': {
      const day = Math.min(TRIAL_DAYS, Math.max(1, Math.floor((now - start) / DAY_MS) + 1));
      return {
        pillLabel: t('sub.trialPill', { days: daysLabel }).toUpperCase(),
        pillBg: '#1B76E8',
        pillInk: '#fff',
        dark: true,
        planName,
        priceLine: t(billing === 'annual' ? 'sub.afterTrialYear' : 'sub.afterTrialMonth', { price: usd(PRICE_USD[billing]) }),
        meterLabel: t('sub.trialEnds', { date: fmtDay(end) }),
        meterValue: t('sub.trialDay', { day, total: TRIAL_DAYS }),
        pct: elapsedPct,
        barColor: '#1B76E8',
        billPlan,
        billNext: fmtDay(end),
        billPay: billedBy(),
        ctaLabel: t('sub.manage'),
        ctaAction: 'store',
        minorLabel: t('sub.cancelTrial'),
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: t('sub.included'),
        listGrey: false,
      };
    }
    case 'monthly':
      return {
        pillLabel: t('sub.active'),
        pillBg: 'rgba(79,216,164,0.2)',
        pillInk: '#8FEAC4',
        dark: true,
        planName: t('sub.premiumMonthly'),
        priceLine: t('sub.perMonth', { price: usd(PRICE_USD.monthly) }),
        meterLabel: t('sub.renews', { date: fmtDay(end) }),
        meterValue: t('sub.perYearAtRate', { price: usd(PRICE_USD.monthly * 12) }),
        pct: 100,
        barColor: '#1B76E8',
        billPlan: t('sub.billMonthly'),
        billNext: fmtDay(end),
        billPay: billedBy(),
        ctaLabel: t('sub.switchAnnual'),
        ctaAction: 'paywall',
        minorLabel: t('sub.cancel'),
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: t('sub.included'),
        listGrey: false,
      };
    case 'annual':
      return {
        pillLabel: t('sub.active'),
        pillBg: 'rgba(79,216,164,0.2)',
        pillInk: '#8FEAC4',
        dark: true,
        planName: t('sub.premiumAnnual'),
        priceLine: t('sub.perYearApprox', { price: usd(PRICE_USD.annual), mo: usd(PRICE_USD.annual / 12) }),
        meterLabel: t('sub.renews', { date: fmtDay(end) }),
        meterValue: t('sub.approxMonth', { mo: usd(PRICE_USD.annual / 12) }),
        pct: 100,
        barColor: '#1B76E8',
        billPlan: t('sub.billAnnual'),
        billNext: fmtDay(end),
        billPay: billedBy(),
        ctaLabel: t('sub.manage'),
        ctaAction: 'store',
        minorLabel: t('sub.cancel'),
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: t('sub.included'),
        listGrey: false,
      };
    case 'ending': {
      const endDate = new Date(end);
      return {
        pillLabel: t('sub.ends', { date: fmtDate(endDate) }).toUpperCase(),
        pillBg: 'rgba(184,134,43,0.22)',
        pillInk: '#EFC985',
        dark: true,
        planName,
        priceLine: t('sub.cancelled'),
        meterLabel: t('sub.premiumUntil', { date: fmtDay(end) }),
        meterValue: daysLabel,
        // Drains toward the end date.
        pct: 100 - elapsedPct,
        barColor: '#D9A356',
        billPlan,
        billNext: '—',
        billPay: billedBy(),
        ctaLabel: t('sub.keepPremium'),
        ctaAction: 'store',
        minorLabel: t('sub.freeChangesTitle'),
        minorInk: '#0F5FC4',
        minorAction: 'ending-info',
        listTitle: t('sub.included'),
        listGrey: false,
      };
    }
    case 'free':
    default: {
      const atLimit = activePlans >= FREE_ACTIVE_PLAN_LIMIT;
      return {
        pillLabel: t('sub.freePlan'),
        pillBg: '#EEF3FA',
        pillInk: '#3A4759',
        dark: false,
        planName: t('paywall.free'),
        priceLine: t('sub.freeForever'),
        meterLabel: t('sub.activeUsed'),
        meterValue: t('common.of', { n: Math.min(activePlans, FREE_ACTIVE_PLAN_LIMIT), total: FREE_ACTIVE_PLAN_LIMIT }),
        pct: Math.min(100, (activePlans / FREE_ACTIVE_PLAN_LIMIT) * 100),
        barColor: atLimit ? '#D9A356' : '#1B76E8',
        billPlan: t('paywall.free'),
        billNext: '—',
        billPay: '—',
        ctaLabel: t('paywall.cta.trial'),
        ctaAction: 'paywall',
        minorLabel: t('sub.restorePurchases'),
        minorInk: '#5A6A80',
        minorAction: 'restore',
        listTitle: t('sub.unlock'),
        listGrey: true,
      };
    }
  }
}
