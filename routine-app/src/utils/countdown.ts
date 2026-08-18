import type { Plan } from '@/store/types';
import { fromISO } from '@/utils/dates';

/** Live Activity countdown logic ported from planner-app-prototype.html. */

export function planDateTime(plan: Plan): Date {
  const [h, m] = plan.time.split(':').map(Number);
  const d = fromISO(plan.date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function secondsUntilPlan(plan: Plan): number {
  return Math.round((planDateTime(plan).getTime() - Date.now()) / 1000);
}

/** Nearest upcoming (or just-started, within a 60s grace window) live-toggled plan. */
export function findActiveLivePlan(plans: Plan[]): Plan | null {
  const candidates = plans
    .filter((p) => p.live && !p.completed && secondsUntilPlan(p) > -60)
    .sort((a, b) => secondsUntilPlan(a) - secondsUntilPlan(b));
  return candidates[0] ?? null;
}

const DAY_SECONDS = 86400;

/** Live-toggled plans that already ended (past the 60s grace window), up to `withinDays` ago, most recent first. */
export function findPastLivePlans(plans: Plan[], withinDays = 30): Plan[] {
  const cutoff = -withinDays * DAY_SECONDS;
  return plans
    .filter((p) => p.live && secondsUntilPlan(p) <= -60 && secondsUntilPlan(p) > cutoff)
    .sort((a, b) => secondsUntilPlan(b) - secondsUntilPlan(a));
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
