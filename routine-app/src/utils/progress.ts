import { SwatchColorNames } from '@/constants/theme';
import type { Plan } from '@/store/types';
import { fromISO, toISO } from '@/utils/dates';

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
    label: SwatchColorNames[color] ?? 'Color',
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
    const end = new Date(todayObj);
    end.setDate(end.getDate() - 7 * offset);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
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

export function pctDelta(cur: number, prev: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The nav-bar label for whichever period is currently in view, e.g. "Aug 19 – 25, 2026". */
export function formatPeriodLabel(period: Period, range: RangeResult): string {
  const start = fromISO(range.start);
  const end = fromISO(range.end);
  if (period === 'year') return String(start.getFullYear());
  if (period === 'month') return `${MONTH_LONG[start.getMonth()]} ${start.getFullYear()}`;
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endStr = sameMonth ? `${end.getDate()}` : `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
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
  return MONTH_SHORT.map((label, m) => {
    const monthStart = new Date(year, m, 1);
    if (monthStart > todayObj) return { label, completed: 0, isFuture: true };
    const monthEndFull = new Date(year, m + 1, 0);
    const monthEnd = monthEndFull > todayObj ? todayObj : monthEndFull;
    const sum = sumHistory(datesInRange(toISO(monthStart), toISO(monthEnd)), todayISO, plans);
    return { label, completed: sum.completed, isFuture: false };
  });
}
