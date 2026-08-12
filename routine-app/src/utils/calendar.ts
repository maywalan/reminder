import { toISO } from '@/utils/dates';

export interface MonthCell {
  day: number;
  muted: boolean;
  date: string | null;
}

/** Ported from renderMonthView() in planner-app-prototype.html. */
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = startOffset; i > 0; i--) {
    cells.push({ day: daysInPrevMonth - i + 1, muted: true, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, muted: false, date: toISO(new Date(year, month, d)) });
  }
  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextMonthDay++, muted: true, date: null });
  }
  return cells;
}

/** Sun–Sat ISO dates for the week containing `selectedISO`. */
export function buildWeekDates(selectedISO: string, fromISOFn: (s: string) => Date): string[] {
  const sel = fromISOFn(selectedISO);
  const startOfWeek = new Date(sel);
  startOfWeek.setDate(sel.getDate() - sel.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return toISO(d);
  });
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
