import type { Plan, SubscriptionState } from '@/store/types';
import { toISO } from '@/utils/dates';
import { isMissedToday } from '@/utils/home-feed';
import type { Period } from '@/utils/progress';

const DAY_MS = 86_400_000;

/** Whole calendar days from `now` to `ms` (0 = today, 1 = tomorrow). */
export function calendarDaysUntil(ms: number, now = new Date()): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const e = new Date(ms);
  const b = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** A cancelled Premium shows "ends soon" reminders in its last week (2026-11-14). */
export const PREMIUM_ENDING_WINDOW_DAYS = 7;

/** Free tier's cap on active plans (3 since 2026-11-03; was 5). */
export const FREE_ACTIVE_PLAN_LIMIT = 3;

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
