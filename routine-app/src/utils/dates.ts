/** Date helpers ported verbatim from planner-app-prototype.html. */

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Whole calendar days from one YYYY-MM-DD to another (negative if `b` is earlier). */
export const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

/** `iso` moved by `n` calendar days. */
export const addDaysISO = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

/**
 * Every day a plan covers, start to end (YYYY-MM-DD). One day unless a time range ends on a later
 * day (`endDate`); capped at a year so a bad end date can't build a huge list. A multi-day plan is
 * listed and dotted on every one of these days (user, 2026-11-25).
 */
export const planDays = (p: { date: string; endDate?: string }): string[] => {
  const span = p.endDate ? Math.min(Math.max(daysBetween(p.date, p.endDate), 0), 366) : 0;
  return Array.from({ length: span + 1 }, (_, i) => (i === 0 ? p.date : addDaysISO(p.date, i)));
};

/**
 * Which part of a plan falls on `iso`: its only day, its start day, a whole day in the middle, or
 * its end day. Lists label these like iOS Calendar: "07:30", "All day", "Ends 18:00".
 */
export type PlanDayRole = 'single' | 'start' | 'middle' | 'end';
export const planDayRole = (p: { date: string; endDate?: string }, iso: string): PlanDayRole => {
  if (!p.endDate || p.endDate <= p.date) return 'single';
  if (iso <= p.date) return 'start';
  return iso >= p.endDate ? 'end' : 'middle';
};

/** Whether a plan covers `iso`, from its start day through its end day. */
export const planCoversDate = (p: { date: string; endDate?: string }, iso: string) =>
  iso >= p.date && iso <= (p.endDate && p.endDate > p.date ? p.endDate : p.date);

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function fmtTime12(time: string) {
  let [h, m] = time.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${pad(m)} ${ap}`;
}
