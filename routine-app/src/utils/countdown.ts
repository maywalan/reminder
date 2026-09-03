import type { Plan } from '@/store/types';
import { fromISO, toISO } from '@/utils/dates';
import { deviceTimeZone, zonedWallTimeToDate } from '@/utils/timezone';

/** Elapsed time since a session started, "m:ss" (or "h:mm:ss" past an hour) — no "in"/"ago" framing. */
export function formatElapsedClock(diffSec: number): string {
  const s = Math.max(0, Math.round(diffSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

/** "37 min left" from a count of seconds remaining. */
export function formatMinutesLeft(diffSec: number): string {
  const m = Math.max(0, Math.ceil(diffSec / 60));
  return `${m} min left`;
}

/** Live Activity countdown logic ported from planner-app-prototype.html. */

export function planDateTime(plan: Plan): Date {
  return zonedWallTimeToDate(plan.date, plan.time, plan.timezone ?? deviceTimeZone());
}

export function secondsUntilPlan(plan: Plan): number {
  return Math.round((planDateTime(plan).getTime() - Date.now()) / 1000);
}

export function planEndDateTime(plan: Plan): Date | null {
  if (!plan.endTime) return null;
  return zonedWallTimeToDate(plan.date, plan.endTime, plan.timezone ?? deviceTimeZone());
}

/** Seconds until `plan.endTime`, or null for a plan with no end time set. */
export function secondsUntilPlanEnd(plan: Plan): number | null {
  const end = planEndDateTime(plan);
  return end ? Math.round((end.getTime() - Date.now()) / 1000) : null;
}

/**
 * Every live-toggled plan that's either still upcoming, or actually running right now — nearest
 * first. A plan with an end time stays "running" (and its Live Activity card visible) for its
 * real duration plus a 60s grace window past the end; one without an end time falls back to the
 * previous behaviour, a flat 60s grace window past its start.
 */
export function findActiveLivePlans(plans: Plan[]): Plan[] {
  return plans
    .filter((p) => {
      if (!p.live || p.completed) return false;
      const untilStart = secondsUntilPlan(p);
      if (untilStart > 0) return true;
      const untilEnd = secondsUntilPlanEnd(p);
      return untilEnd !== null ? untilEnd > -60 : untilStart > -60;
    })
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
