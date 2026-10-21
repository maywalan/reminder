import type { Plan } from '@/store/types';
import { findPastPlans, planDateTime, planEndDateTime } from '@/utils/countdown';
import { pad, timeToMinutes, toISO } from '@/utils/dates';
import { t } from '@/i18n';

/**
 * Derived state for the Home screen (design_handoff_tickle_home_7, week strip + feed from
 * design_handoff_tickle_home_timeline). The store only knows
 * `completed`; everything else — live, overtime, missed — is derived from the clock:
 *
 * - A **time-range** task goes live on its own at its start time and stays live (overtime past its
 *   end) until checked off.
 * - A **point reminder** goes live ("due now") at its time for 15 minutes, then counts as missed
 *   if it isn't checked off.
 * - Only one task is live at a time: the earliest-started one. Anything else that has started
 *   meanwhile stays a normal rail row until the live one is done.
 * - An **all-day** task is never live or missed while its day lasts.
 * - A range left unfinished on a past day counts as missed.
 */

/** How long a point reminder stays live ("due now") past its time before it counts as missed. */
export const POINT_DUE_MS = 15 * 60_000;

function hasStarted(plan: Plan, nowMs: number) {
  return planDateTime(plan).getTime() <= nowMs;
}

export function isMissedToday(plan: Plan, nowMs: number) {
  return !plan.completed && !plan.allDay && !plan.endTime && planDateTime(plan).getTime() <= nowMs - POINT_DUE_MS;
}

export interface UpcomingDay {
  dateISO: string;
  plans: Plan[];
}

export interface HomeFeed {
  /** The day picked in the week strip (today by default). */
  dayISO: string;
  isToday: boolean;
  /** Every plan on that day, done ones included, in timeline order. */
  day: Plan[];
  /** The running plan — only when the picked day is today. */
  live: Plan | null;
  /** Plans on the picked day not yet done (today: not missed either). */
  leftCount: number;
  /** Plans left undone on a past day. */
  missedCount: number;
  /** Incomplete plans on each of the next 3 days after today, days with none left out. */
  upcoming: UpcomingDay[];
  /** Done + missed tasks from previous days (for "See all"), most recent first. */
  older: Plan[];
}

/** Whether a plan is over: its end (or, for a point reminder, its time) has passed. All-day plans end with their day. */
export function planIsPast(plan: Plan, nowMs: number): boolean {
  const todayISO = toISO(new Date(nowMs));
  if (plan.date !== todayISO) return plan.date < todayISO;
  if (plan.allDay) return false;
  return (planEndDateTime(plan) ?? planDateTime(plan)).getTime() <= nowMs;
}

export function buildHomeFeed(plans: Plan[], nowMs: number, matches: (p: Plan) => boolean, dayISO?: string, upcomingDays = 3): HomeFeed {
  const todayISO = toISO(new Date(nowMs));
  const selected = dayISO ?? todayISO;
  const isToday = selected === todayISO;
  const todayPlans = plans.filter((p) => p.date === todayISO && matches(p));
  const dayPlans = isToday ? todayPlans : plans.filter((p) => p.date === selected && matches(p));

  const live = isToday
    ? (dayPlans
        .filter((p) => !p.completed && !p.allDay && hasStarted(p, nowMs) && (p.endTime || !isMissedToday(p, nowMs)))
        .sort((a, b) => a.time.localeCompare(b.time))[0] ?? null)
    : null;

  const hasManualOrder = dayPlans.some((p) => p.order !== undefined);
  const day = [...dayPlans].sort((a, b) => {
    // All-day tasks have no real time, so they sit at the top of the timeline.
    if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
    return hasManualOrder ? (a.order ?? Infinity) - (b.order ?? Infinity) : a.time.localeCompare(b.time);
  });

  const undone = day.filter((p) => !p.completed);
  const leftCount = selected < todayISO ? 0 : undone.filter((p) => !isToday || !isMissedToday(p, nowMs)).length;
  const missedCount = selected < todayISO ? undone.length : 0;

  const older = findPastPlans(plans).filter((p) => p.date < todayISO && matches(p));

  const upcoming: UpcomingDay[] = [];
  for (let i = 1; i <= upcomingDays; i++) {
    const d = new Date(nowMs);
    d.setDate(d.getDate() + i);
    const iso = toISO(d);
    const items = plans
      .filter((p) => p.date === iso && !p.completed && matches(p))
      .sort((a, b) => (!!a.allDay !== !!b.allDay ? (a.allDay ? -1 : 1) : a.time.localeCompare(b.time)));
    if (items.length) upcoming.push({ dateISO: iso, plans: items });
  }

  return { dayISO: selected, isToday, day, live, leftCount, missedCount, upcoming, older };
}

export function durationMinutes(plan: Plan): number {
  if (!plan.endTime) return 0;
  return Math.max(0, timeToMinutes(plan.endTime) - timeToMinutes(plan.time));
}

/** "45 min", "1 hr", "2 hr", "1 hr 30 min". */
export function formatDuration(min: number, { dropMinutesAfterHours = false } = {}): string {
  if (min < 60) return t('duration.min', { m: min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m && !dropMinutesAfterHours ? t('duration.hrMin', { h, m }) : t('duration.hr', { h });
}

/** Elapsed ÷ duration for a started range, clamped to [0, 1]; plus seconds left (negative = overtime). */
export function liveProgress(plan: Plan, nowMs: number): { progress: number; secondsLeft: number } {
  const start = planDateTime(plan).getTime();
  const end = planEndDateTime(plan)?.getTime() ?? start;
  const total = Math.max(1, end - start);
  return {
    progress: Math.min(1, Math.max(0, (nowMs - start) / total)),
    secondsLeft: Math.round((end - nowMs) / 1000),
  };
}

/** A due point reminder: how far into its 15-minute due window, [0, 1], and seconds since its time. */
export function dueProgress(plan: Plan, nowMs: number): { progress: number; secondsOver: number } {
  const elapsed = nowMs - planDateTime(plan).getTime();
  return { progress: Math.min(1, Math.max(0, elapsed / POINT_DUE_MS)), secondsOver: Math.max(0, Math.round(elapsed / 1000)) };
}

/** "36:48", or "1:02:05" over an hour; overtime reads "+m:ss". */
export function formatLiveCountdown(secondsLeft: number): string {
  const over = secondsLeft < 0;
  const s = Math.abs(secondsLeft);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const clock = h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  return over ? `+${clock}` : clock;
}

/**
 * The one task that gets the Live Activity right now, if any — only tasks with their "Live
 * Activity" switch on. A running time-range session today wins (the earliest-started, overtime
 * included, until checked off); otherwise the soonest switched-on task that hasn't started yet,
 * on any day — it counts down from the moment its switch is on, not from a fixed lead time. A
 * point reminder stays "upcoming" through its 15-minute due window (the Lock Screen shows
 * "Now"), then drops out once it's missed.
 */
export function findLiveActivityPlan(plans: Plan[], nowMs: number): { plan: Plan; phase: 'upcoming' | 'live' } | null {
  const todayISO = toISO(new Date(nowMs));
  const candidates = plans.filter((p) => p.live && !p.completed && !p.allDay && p.date >= todayISO);

  const running = candidates
    .filter((p) => p.date === todayISO && p.endTime && hasStarted(p, nowMs))
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  if (running) return { plan: running, phase: 'live' };

  const upcoming = candidates
    .map((p) => ({ p, untilMs: planDateTime(p).getTime() - nowMs }))
    .filter(({ p, untilMs }) => untilMs > 0 || (!p.endTime && untilMs > -POINT_DUE_MS))
    .sort((a, b) => a.untilMs - b.untilMs)[0]?.p;
  return upcoming ? { plan: upcoming, phase: 'upcoming' } : null;
}

/** `time` + `minutes`, capped at 23:59 so a session never rolls into tomorrow. */
export function addMinutesToTime(time: string, minutes: number): string {
  const total = Math.min(23 * 60 + 59, timeToMinutes(time) + minutes);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
