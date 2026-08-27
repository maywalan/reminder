import type { Plan } from '@/store/types';
import { fromISO, toISO } from '@/utils/dates';
import { deviceTimeZone, zonedWallTimeToDate } from '@/utils/timezone';

/** Live Activity countdown logic ported from planner-app-prototype.html. */

export function planDateTime(plan: Plan): Date {
  return zonedWallTimeToDate(plan.date, plan.time, plan.timezone ?? deviceTimeZone());
}

export function secondsUntilPlan(plan: Plan): number {
  return Math.round((planDateTime(plan).getTime() - Date.now()) / 1000);
}

/** Every upcoming (or just-started, within a 60s grace window) live-toggled plan, nearest first. */
export function findActiveLivePlans(plans: Plan[]): Plan[] {
  return plans
    .filter((p) => p.live && !p.completed && secondsUntilPlan(p) > -60)
    .sort((a, b) => secondsUntilPlan(a) - secondsUntilPlan(b));
}

const DAY_SECONDS = 86400;

/**
 * Like secondsUntilPlan, but an all-day plan counts as "ended" only once its whole calendar date
 * has passed — its stored time is just a nominal placeholder, not a real end time, so using it
 * directly would flag an all-day plan as already past partway through its own day.
 */
function effectiveSecondsUntil(plan: Plan): number {
  if (!plan.allDay) return secondsUntilPlan(plan);
  const end = fromISO(plan.date);
  end.setHours(23, 59, 59, 999);
  return Math.round((end.getTime() - Date.now()) / 1000);
}

/** Plans that already ended (past the 60s grace window), up to `withinDays` ago, most recent first. */
export function findPastPlans(plans: Plan[], withinDays = 30): Plan[] {
  const cutoff = -withinDays * DAY_SECONDS;
  return plans
    .filter((p) => effectiveSecondsUntil(p) <= -60 && effectiveSecondsUntil(p) > cutoff)
    .sort((a, b) => effectiveSecondsUntil(b) - effectiveSecondsUntil(a));
}

/**
 * Plans on a future date (not today — Today's Plan already covers today in full), up to
 * `withinDays` ahead, soonest first.
 */
export function findFuturePlans(plans: Plan[], withinDays = 30): Plan[] {
  const todayISO = toISO(new Date());
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffISO = toISO(cutoff);
  return plans
    .filter((p) => p.date > todayISO && p.date <= cutoffISO)
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

/**
 * mm:ss under an hour, "Xh Ym" under a day, "Xd Xh" under 30 days, "Xmo" beyond that.
 */
export function formatCountdown(diffSec: number): string {
  if (diffSec <= 0) return 'Now';
  if (diffSec < 3600) {
    const mm = Math.floor(diffSec / 60);
    const ss = diffSec % 60;
    return `in ${mm}:${String(ss).padStart(2, '0')}`;
  }
  if (diffSec < 86400) {
    const hh = Math.floor(diffSec / 3600);
    const mm = Math.floor((diffSec % 3600) / 60);
    return mm > 0 ? `in ${hh}h ${mm}m` : `in ${hh}h`;
  }
  if (diffSec < 2592000) {
    const dd = Math.floor(diffSec / 86400);
    const hh = Math.floor((diffSec % 86400) / 3600);
    return hh > 0 ? `in ${dd}d ${hh}h` : `in ${dd}d`;
  }
  const mo = Math.floor(diffSec / 2592000);
  return `in ${mo}mo`;
}
