import type { SubscriptionState } from '@/store/types';

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

/**
 * Fallback content per entitlement state (design_handoff_tickle_subscription/README.md's state
 * table). Dates/prices/payment-method strings here are the spec's own display-conversion fallback
 * copy — once real StoreKit/Play Billing wiring exists, every field but `listTitle`/`listGrey`
 * should come from the live product/entitlement record instead of this table.
 */
export function getSubscriptionContent(state: SubscriptionState): SubscriptionContent {
  switch (state) {
    case 'trial':
      return {
        pillLabel: 'TRIAL · 4 DAYS LEFT',
        pillBg: '#1B76E8',
        pillInk: '#fff',
        dark: true,
        planName: 'Premium — Annual',
        priceLine: '$24.99 / yr after trial',
        meterLabel: 'Trial ends 17 Sep 2026',
        meterValue: 'day 3 of 7',
        pct: 43,
        barColor: '#1B76E8',
        billPlan: 'Premium annual',
        billNext: '17 Sep 2026',
        billPay: 'Apple Pay',
        ctaLabel: 'Manage in App Store',
        ctaAction: 'store',
        minorLabel: 'Cancel trial',
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    case 'monthly':
      return {
        pillLabel: 'ACTIVE',
        pillBg: 'rgba(79,216,164,0.2)',
        pillInk: '#8FEAC4',
        dark: true,
        planName: 'Premium — Monthly',
        priceLine: '$3.99 / month',
        meterLabel: 'Renews 13 Oct 2026',
        meterValue: '$47.88 / yr at this rate',
        pct: 100,
        barColor: '#1B76E8',
        billPlan: 'Premium monthly',
        billNext: '13 Oct 2026',
        billPay: 'Visa ·· 4242',
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
        priceLine: '$24.99 / yr (≈ $2.08/mo)',
        meterLabel: 'Renews 13 Sep 2027',
        meterValue: '≈ $2.08 / mo',
        pct: 100,
        barColor: '#1B76E8',
        billPlan: 'Premium annual',
        billNext: '13 Sep 2027',
        billPay: 'Apple Pay',
        ctaLabel: 'Manage in App Store',
        ctaAction: 'store',
        minorLabel: 'Cancel subscription',
        minorInk: '#5A6A80',
        minorAction: 'store',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    case 'ending':
      return {
        pillLabel: 'ENDS 13 OCT',
        pillBg: 'rgba(184,134,43,0.22)',
        pillInk: '#EFC985',
        dark: true,
        planName: 'Premium — Monthly',
        priceLine: 'Cancelled · no further charges',
        meterLabel: 'Premium until 13 Oct 2026, then Free',
        meterValue: '27 days left',
        pct: 68,
        barColor: '#D9A356',
        billPlan: 'Premium monthly',
        billNext: '—',
        billPay: 'Visa ·· 4242',
        ctaLabel: 'Keep Premium',
        ctaAction: 'store',
        minorLabel: 'What changes on Free?',
        minorInk: '#0F5FC4',
        minorAction: 'ending-info',
        listTitle: 'Included in your plan',
        listGrey: false,
      };
    case 'free':
    default:
      return {
        pillLabel: 'FREE PLAN',
        pillBg: '#EEF3FA',
        pillInk: '#3A4759',
        dark: false,
        planName: 'Free',
        priceLine: '$0 forever',
        meterLabel: 'Active plans used',
        meterValue: '5 of 5',
        pct: 100,
        barColor: '#D9A356',
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
