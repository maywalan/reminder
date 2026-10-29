import { getCalendars } from 'expo-localization';
import { AppState } from 'react-native';

import { lang } from './index';

export { lang };

/**
 * Date/time words and formats per language. Thai follows the iPhone's own Thai style: abbreviated
 * months with dots ("10 ต.ค."), day-first order, Buddhist Era years (พ.ศ. = CE + 543, user's call
 * 2026-10-10), and 24-hour times.
 */

export const MONTH_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  th: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
};
export const MONTH_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
};
export const WEEKDAY_LONG = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  th: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
};
export const WEEKDAY_SHORT = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  th: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
};
/** Single-glyph column headers (calendar grid, repeat-day pickers). */
const WEEKDAY_LETTER = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
};

export const monthLong = (m: number) => MONTH_LONG[lang()][m];
export const monthShort = (m: number) => MONTH_SHORT[lang()][m];
export const weekdayLong = (d: number) => WEEKDAY_LONG[lang()][d];
export const weekdayShort = (d: number) => WEEKDAY_SHORT[lang()][d];
export const weekdayLetter = (d: number) => WEEKDAY_LETTER[lang()][d];
export const monthShortList = () => MONTH_SHORT[lang()];
export const monthLongList = () => MONTH_LONG[lang()];
export const weekdayLetterList = () => WEEKDAY_LETTER[lang()];

/** Calendar year as shown to the user: Buddhist Era in Thai. */
export const displayYear = (y: number) => (lang() === 'th' ? y + 543 : y);

interface DateOpts {
  weekday?: 'short' | 'long';
  month?: 'short' | 'long';
  year?: boolean;
}

/**
 * One formatter for every "a date as text" spot. English keeps each call site's previous output:
 * `day` order 'dm' → "10 Oct 2026" (Subscription, Home), 'md' → "Oct 10, 2026" (en-US style used by
 * New Plan, Calendar, search). Thai is always day-first: "ส. 10 ต.ค. 2569".
 */
export function fmtDate(d: Date, { weekday, month = 'short', year = false }: DateOpts = {}, order: 'dm' | 'md' = 'md'): string {
  const l = lang();
  const m = month === 'long' ? MONTH_LONG[l][d.getMonth()] : MONTH_SHORT[l][d.getMonth()];
  const wd = weekday ? (weekday === 'long' ? WEEKDAY_LONG : WEEKDAY_SHORT)[l][d.getDay()] : null;
  if (l === 'th') {
    return [wd, d.getDate(), m, year ? d.getFullYear() + 543 : null].filter((p) => p !== null).join(' ');
  }
  if (order === 'dm') {
    const core = `${d.getDate()} ${m}${year ? ` ${d.getFullYear()}` : ''}`;
    return wd ? `${wd}, ${core}` : core;
  }
  const core = `${m} ${d.getDate()}${year ? `, ${d.getFullYear()}` : ''}`;
  return wd ? `${wd}, ${core}` : core;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Whether the phone is set to 24-hour time (Settings > General > Date & Time). Read once and
 * refreshed when the app returns to the foreground: fmtTime runs for every row on every countdown
 * tick, too often for a native call each time.
 */
let phone24h = readPhone24h();
function readPhone24h() {
  try {
    return getCalendars()[0]?.uses24hourClock ?? false;
  } catch {
    return false;
  }
}
AppState.addEventListener('change', (state) => {
  if (state === 'active') phone24h = readPhone24h();
});

/**
 * "HH:MM" in the phone's clock style (user, 2026-10-29): "14:30" or "2:30 PM". Thai is always
 * 24-hour, never Latin AM/PM. `compact` drops ":00" on the hour ("2 PM"), for Home's narrow rail.
 */
export function fmtTime(time: string, { compact = false }: { compact?: boolean } = {}): string {
  const [h, m] = time.split(':').map(Number);
  if (lang() === 'th' || phone24h) return `${pad(h)}:${pad(m)}`;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return compact && m === 0 ? `${h12} ${ap}` : `${h12}:${pad(m)} ${ap}`;
}

/** "10:00 – 11:30 AM": in 12-hour time AM/PM is written once when both ends share it, like iOS Calendar. */
export function fmtTimeRange(start: string, end: string): string {
  const a = fmtTime(start);
  const b = fmtTime(end);
  if (!uses12hTime() || a.slice(-2) !== b.slice(-2)) return `${a} – ${b}`;
  return `${a.slice(0, -3)} – ${b}`;
}

/** True when times show as 12-hour ("2:30 PM"); layouts size time columns from it. */
export function uses12hTime(): boolean {
  return lang() !== 'th' && !phone24h;
}
