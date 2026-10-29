import { SwatchColorNames } from '@/constants/theme';
import type { Plan } from '@/store/types';
import { t } from '@/i18n';
import { displayYear, fmtDate, lang, monthLong, monthShortList } from '@/i18n/format';
import { fromISO, toISO } from '@/utils/dates';
import { isMissedToday } from '@/utils/home-feed';

/** Progress screen data logic — every stat here is derived from real plans in the store. */

export interface DayHistory {
  total: number;
  completed: number;
}

export function historyForDate(iso: string, _todayISO: string, plans: Plan[]): DayHistory {
  const dayPlans = plans.filter((p) => p.date === iso);
  return { total: dayPlans.length, completed: dayPlans.filter((p) => p.completed).length };
}

export function datesInRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const cur = fromISO(startISO);
  const end = fromISO(endISO);
  while (cur <= end) {
    out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function sumHistory(dates: string[], todayISO: string, plans: Plan[]): DayHistory {
  return dates.reduce(
    (acc, iso) => {
      const h = historyForDate(iso, todayISO, plans);
      acc.total += h.total;
      acc.completed += h.completed;
      return acc;
    },
    { total: 0, completed: 0 }
  );
}

export function currentStreak(todayISO: string, plans: Plan[]): number {
  let streak = 0;
  const cur = fromISO(todayISO);
  for (;;) {
    const iso = toISO(cur);
    const h = historyForDate(iso, todayISO, plans);
    if (h.completed > 0) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
    if (streak > 400) break;
  }
  return streak;
}

/** Longest run of consecutive calendar dates with at least one completed plan, ever — the "record" the streak card measures itself against. */
export function longestStreak(plans: Plan[]): number {
  const completedDates = Array.from(new Set(plans.filter((p) => p.completed).map((p) => p.date))).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const iso of completedDates) {
    const d = fromISO(iso);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function bestWeekday(dates: string[], todayISO: string, plans: Plan[]): number {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  dates.forEach((iso) => {
    const d = fromISO(iso);
    const h = historyForDate(iso, todayISO, plans);
    totals[d.getDay()] += h.completed;
    counts[d.getDay()]++;
  });
  let best = 0;
  let bestAvg = -1;
  totals.forEach((sum, i) => {
    const avg = counts[i] ? sum / counts[i] : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = i;
    }
  });
  return best;
}

export interface ColorRow {
  color: string;
  label: string;
  count: number;
  pct: number;
}

/** Real breakdown of completed plans by color within the given dates — no groups involved, since group creation isn't wired up yet and every plan always has a color. */
export function colorBreakdown(dates: string[], plans: Plan[]): ColorRow[] {
  const dateSet = new Set(dates);
  const completed = plans.filter((p) => dateSet.has(p.date) && p.completed);
  const counts = new Map<string, number>();
  for (const p of completed) counts.set(p.color, (counts.get(p.color) ?? 0) + 1);

  const total = completed.length;
  const rows = Array.from(counts.entries()).map(([color, count]) => ({
    color,
    label: t(SwatchColorNames[color] ?? 'color.other'),
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
  rows.sort((a, b) => b.count - a.count);
  return rows;
}

export type Period = 'week' | 'month' | 'year';

export interface RangeResult {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
}

/**
 * `offset` counts periods back from the current one (0 = this week/month/year, 1 = the one
 * before, etc.) so the Progress screen can navigate through history, not just view "now".
 */
export function progressRange(period: Period, todayISO: string, offset = 0): RangeResult {
  const todayObj = fromISO(todayISO);
  if (period === 'week') {
    // The app's Sun–Sat week, like Calendar, Home and the widgets (critique, 2026-10-29: Stats used
    // the last 7 days, Fri–Thu). The current week runs to today and is compared with the same days
    // of last week, as month and year already are.
    const start = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate() - todayObj.getDay() - 7 * offset);
    const end = offset === 0 ? todayObj : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const elapsed = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
    const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate() + elapsed);
    return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
  }
  if (period === 'month') {
    const targetMonth = new Date(todayObj.getFullYear(), todayObj.getMonth() - offset, 1);
    const start = new Date(targetMonth);
    const isCurrent = offset === 0;
    const lastDayOfTarget = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const end = isCurrent ? todayObj : lastDayOfTarget;
    const prevMonthDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const prevEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), Math.min(end.getDate(), daysInPrevMonth));
    return { start: toISO(start), end: toISO(end), prevStart: toISO(prevMonthDate), prevEnd: toISO(prevEnd) };
  }
  const targetYear = todayObj.getFullYear() - offset;
  const isCurrent = offset === 0;
  const start = new Date(targetYear, 0, 1);
  const end = isCurrent ? todayObj : new Date(targetYear, 11, 31);
  const prevStart = new Date(targetYear - 1, 0, 1);
  const prevEnd = isCurrent ? new Date(targetYear - 1, todayObj.getMonth(), todayObj.getDate()) : new Date(targetYear - 1, 11, 31);
  return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
}

/** The Saturday ending the Sun–Sat week that starts on `startISO`. */
export function weekEndISO(startISO: string): string {
  const d = fromISO(startISO);
  d.setDate(d.getDate() + 6);
  return toISO(d);
}

/** Unfinished plans in `dates` that are already missed by Home's rule. */
export function missedCount(dates: string[], todayISO: string, plans: Plan[], nowMs: number): number {
  const set = new Set(dates);
  return plans.filter((p) => set.has(p.date) && !p.completed && (p.date < todayISO || (p.date === todayISO && isMissedToday(p, nowMs)))).length;
}

/** The hour (0–23) when most finished, timed plans in `dates` were set; null when there are none. */
export function busiestHour(dates: string[], plans: Plan[]): number | null {
  const set = new Set(dates);
  const counts = new Map<number, number>();
  for (const p of plans) {
    if (!set.has(p.date) || !p.completed || p.allDay) continue;
    const h = Number(p.time.split(':')[0]);
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [h, n] of counts) if (best === null || n > counts.get(best)!) best = h;
  return best;
}

/** Hero card's uppercase eyebrow line — "THIS WEEK" / "AUGUST" / "2026 SO FAR". */
export function heroEyebrow(period: Period, range: RangeResult, offset: number): string {
  const start = fromISO(range.start);
  if (period === 'week') return offset === 0 ? t('progress.eyebrow.thisWeek') : t('progress.eyebrow.thatWeek');
  if (period === 'month') return monthLong(start.getMonth()).toUpperCase();
  const year = displayYear(start.getFullYear());
  return offset === 0 ? t('progress.eyebrow.yearSoFar', { year }) : String(year);
}

/** Hero card's delta line target — "last week" / "July" / "2025". */
export function previousPeriodLabel(period: Period, range: RangeResult): string {
  if (period === 'week') return t('progress.lastWeek');
  const prevStart = fromISO(range.prevStart);
  if (period === 'month') return t('progress.prevMonth', { month: monthLong(prevStart.getMonth()) });
  return t('progress.prevYear', { year: displayYear(prevStart.getFullYear()) });
}

/** The nav-bar label for whichever period is currently in view, e.g. "Aug 19 – 25, 2026". */
export function formatPeriodLabel(period: Period, range: RangeResult): string {
  const start = fromISO(range.start);
  const end = fromISO(range.end);
  if (period === 'year') return String(displayYear(start.getFullYear()));
  if (period === 'month') return `${monthLong(start.getMonth())} ${displayYear(start.getFullYear())}`;
  // A week always shows its full Sun–Sat span, even while it's still under way.
  if (period === 'week') end.setTime(fromISO(weekEndISO(range.start)).getTime());
  const sameMonth = start.getMonth() === end.getMonth();
  if (lang() === 'th') {
    // "19 – 25 ส.ค. 2569" / "28 ส.ค. – 3 ก.ย. 2569"
    const startStr = sameMonth ? `${start.getDate()}` : fmtDate(start);
    return `${startStr} – ${fmtDate(end)} ${displayYear(end.getFullYear())}`;
  }
  const startStr = fmtDate(start);
  const endStr = sameMonth ? `${end.getDate()}` : fmtDate(end);
  return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

export interface HeatCell {
  iso: string;
  completed: number;
  isFuture: boolean;
}

/**
 * Weekday-padded heatmap cells for any date range — the same grid shape (7-wide, wraps into
 * calendar-aligned rows) powers Week and Month views. Year uses `yearMonthCells` instead — a
 * day-per-cell grid across a full year is unreadably tall on a phone.
 */
export function heatmapCells(startISO: string, endISO: string, todayISO: string, plans: Plan[]): { startOffset: number; cells: HeatCell[] } {
  const startOffset = fromISO(startISO).getDay();
  const cells = datesInRange(startISO, endISO).map((iso) => {
    const h = historyForDate(iso, todayISO, plans);
    return { iso, completed: h.completed, isFuture: iso > todayISO };
  });
  return { startOffset, cells };
}

export interface MonthCell {
  label: string;
  completed: number;
  isFuture: boolean;
}

/** One heat cell per month of the given year — a Google-Calendar-style year-at-a-glance grid. */
export function yearMonthCells(year: number, todayISO: string, plans: Plan[]): MonthCell[] {
  const todayObj = fromISO(todayISO);
  return monthShortList().map((label, m) => {
    const monthStart = new Date(year, m, 1);
    if (monthStart > todayObj) return { label, completed: 0, isFuture: true };
    const monthEndFull = new Date(year, m + 1, 0);
    const monthEnd = monthEndFull > todayObj ? todayObj : monthEndFull;
    const sum = sumHistory(datesInRange(toISO(monthStart), toISO(monthEnd)), todayISO, plans);
    return { label, completed: sum.completed, isFuture: false };
  });
}
