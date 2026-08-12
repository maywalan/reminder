import type { Group, Plan } from '@/store/types';
import { fromISO, toISO } from '@/utils/dates';

/** Progress screen data logic, ported from planner-app-prototype.html's Progress section. */

function seededRandom(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export interface DayHistory {
  total: number;
  completed: number;
}

/** Today reflects live data from the store; past days are seeded-random, future days are empty. */
export function historyForDate(iso: string, todayISO: string, plans: Plan[]): DayHistory {
  if (iso > todayISO) return { total: 0, completed: 0 };
  if (iso === todayISO) {
    const todays = plans.filter((p) => p.date === todayISO);
    return { total: todays.length, completed: todays.filter((p) => p.completed).length };
  }
  const d = fromISO(iso);
  const dow = d.getDay();
  const rnd = seededRandom(hashStr(iso));
  const baseTotal = dow === 0 || dow === 6 ? 1 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 4);
  const offDay = rnd() < 0.16;
  if (offDay) return { total: baseTotal, completed: 0 };
  const today = fromISO(todayISO);
  const daysAgo = Math.round((today.getTime() - d.getTime()) / 86400000);
  const drift = Math.min(0.22, (daysAgo / 365) * 0.22);
  const rate = Math.max(0.35, Math.min(0.95, 0.8 - drift + (rnd() - 0.5) * 0.3));
  return { total: baseTotal, completed: Math.max(1, Math.min(baseTotal, Math.round(baseTotal * rate))) };
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

export interface CategoryRow {
  group: Group;
  count: number;
  pct: number;
}

export function categoryBreakdown(periodTotal: number, seedKey: string, groups: Group[]): CategoryRow[] {
  if (periodTotal <= 0) return groups.map((g) => ({ group: g, count: 0, pct: 0 }));
  const rnd = seededRandom(hashStr(seedKey));
  const weights = groups.map(() => 0.5 + rnd());
  const sumW = weights.reduce((a, b) => a + b, 0);
  const rows = groups.map((g, i) => ({ group: g, count: Math.round((periodTotal * weights[i]) / sumW), pct: 0 }));
  rows.sort((a, b) => b.count - a.count);
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  rows.forEach((r) => (r.pct = Math.round((r.count / total) * 100)));
  return rows;
}

export type Period = 'week' | 'month' | 'year';

export interface RangeResult {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
}

export function progressRange(period: Period, todayISO: string): RangeResult {
  const todayObj = fromISO(todayISO);
  if (period === 'week') {
    const end = new Date(todayObj);
    const start = new Date(todayObj);
    start.setDate(start.getDate() - 6);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
  }
  if (period === 'month') {
    const start = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
    const end = new Date(todayObj);
    const elapsed = todayObj.getDate();
    const prevMonthDate = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const prevEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), Math.min(elapsed, daysInPrevMonth));
    return { start: toISO(start), end: toISO(end), prevStart: toISO(prevMonthDate), prevEnd: toISO(prevEnd) };
  }
  const start = new Date(todayObj.getFullYear(), 0, 1);
  const end = new Date(todayObj);
  const prevStart = new Date(todayObj.getFullYear() - 1, 0, 1);
  const prevEnd = new Date(todayObj.getFullYear() - 1, todayObj.getMonth(), todayObj.getDate());
  return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
}

export function pctDelta(cur: number, prev: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export interface Bar {
  value: number;
  label: string;
  future: boolean;
}

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekBars(dates: string[], todayISO: string, plans: Plan[]): Bar[] {
  return dates.map((iso) => {
    const h = historyForDate(iso, todayISO, plans);
    const d = fromISO(iso);
    return { value: h.completed, label: WD_SHORT[d.getDay()], future: iso > todayISO };
  });
}

/** Always the current year (the prototype's Progress "year" view has no year navigation). */
export function yearBars(todayISO: string, plans: Plan[]): Bar[] {
  const todayObj = fromISO(todayISO);
  const year = todayObj.getFullYear();
  const lastMonth = todayObj.getMonth();
  const bars: Bar[] = [];
  for (let m = 0; m <= lastMonth; m++) {
    const monthStart = new Date(year, m, 1);
    const monthEndFull = new Date(year, m + 1, 0);
    const monthEnd = monthEndFull > todayObj ? todayObj : monthEndFull;
    const dates = datesInRange(toISO(monthStart), toISO(monthEnd));
    const sum = sumHistory(dates, todayISO, plans);
    bars.push({ value: sum.completed, label: MONTH_SHORT[m], future: false });
  }
  for (let m = lastMonth + 1; m < 12; m++) {
    bars.push({ value: 0, label: MONTH_SHORT[m], future: true });
  }
  return bars;
}

export interface HeatCell {
  day: number;
  iso: string;
  completed: number;
  isFuture: boolean;
}

export function monthHeatmapCells(todayISO: string, plans: Plan[]): { startOffset: number; cells: HeatCell[] } {
  const todayObj = fromISO(todayISO);
  const year = todayObj.getFullYear();
  const month = todayObj.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: HeatCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(new Date(year, month, d));
    const h = historyForDate(iso, todayISO, plans);
    cells.push({ day: d, iso, completed: h.completed, isFuture: iso > todayISO });
  }
  return { startOffset, cells };
}
