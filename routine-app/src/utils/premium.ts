import type { Plan, SubscriptionState } from '@/store/types';
import { toISO } from '@/utils/dates';
import { isMissedToday } from '@/utils/home-feed';
import type { Period } from '@/utils/progress';

/** Free tier's cap on active plans (paywall README: "5 active plans"). */
export const FREE_ACTIVE_PLAN_LIMIT = 5;

export function isPremium(state: SubscriptionState): boolean {
  return state !== 'free';
}

/** Month and Year progress/recap are Premium; Week stays free. */
export function isPeriodLocked(period: Period, state: SubscriptionState): boolean {
  return period !== 'week' && !isPremium(state);
}

/** An occurrence still to do: not done, not on a past day, and not already missed today. */
function isOpen(plan: Plan, todayISO: string, nowMs: number): boolean {
  if (plan.completed || plan.date < todayISO) return false;
  if (plan.date > todayISO) return true;
  return !isMissedToday(plan, nowMs);
}

/**
 * How many plans still have something left to do. A repeating plan's occurrences share a
 * `repeatId` and count once; done and missed plans don't count.
 */
export function countActivePlans(plans: Plan[], now = new Date()): number {
  const todayISO = toISO(now);
  const nowMs = now.getTime();
  const active = new Set<string>();
  for (const p of plans) {
    if (isOpen(p, todayISO, nowMs)) active.add(p.repeatId ?? p.id);
  }
  return active.size;
}

// Paywall / Subscription feature lists. Only what the app really has and really gates (the plan
// limit and Month/Year recaps above). Don't list a feature until it exists and is locked.
export const FREE_FEATURES = ['feature.free.plans', 'feature.free.today', 'feature.free.week', 'feature.free.widgets'] as const;
export const PREMIUM_FEATURES = ['feature.pro.plans', 'feature.pro.recaps', 'feature.pro.free'] as const;
