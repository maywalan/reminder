import { fromISO, pad, toISO } from '@/utils/dates';

/** Repeat rules ported verbatim from planner-app-prototype.html, plus a custom interval/weekday rule. */

export type RepeatType = 'none' | '1h' | '1d' | 'week' | 'month' | 'custom';

export const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: '1h', label: 'Every 1 hour' },
  { value: '1d', label: 'Every 1 day' },
  { value: 'week', label: 'Every week' },
  { value: 'month', label: 'Every month' },
  { value: 'custom', label: 'Custom…' },
];

export type CustomRepeatUnit = 'day' | 'week' | 'month';

export interface CustomRepeatConfig {
  interval: number; // every N units, >= 1
  unit: CustomRepeatUnit;
  /** Only meaningful when unit === 'week'. Empty means "just the start date's weekday". Sunday = 0. */
  weekdays: number[];
}

export const WEEKDAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function customRepeatLabel(config: CustomRepeatConfig): string {
  const n = config.interval;
  if (config.unit === 'day') return n === 1 ? 'Every day' : `Every ${n} days`;
  if (config.unit === 'month') return n === 1 ? 'Every month' : `Every ${n} months`;
  const weekPart = n === 1 ? 'Every week' : `Every ${n} weeks`;
  if (config.weekdays.length === 0) return weekPart;
  const days = [...config.weekdays].sort((a, b) => a - b).map((d) => WEEKDAY_ABBR[d]);
  return `${weekPart} on ${days.join(', ')}`;
}

const REPEAT_CAP = 150;
/** Hard safety bound on week-cycles scanned for the weekday-matrix expansion, independent of REPEAT_CAP,
 *  so a huge interval + an "until" far in the future can't spin the loop indefinitely. */
const MAX_WEEK_CYCLES = 2000;

/**
 * A sensible default "repeat until" date for a freshly-picked repeat type, so simply choosing
 * "Every week" and saving already produces a repeating series instead of defaulting to the same
 * day as the start date (which would generate exactly one occurrence — effectively no repeat).
 * Hour-based cadences default to the same day, since several occurrences already fit within it.
 */
export function defaultRepeatUntil(start: Date, repeatType: RepeatType, customConfig?: CustomRepeatConfig): Date {
  const d = new Date(start);
  switch (repeatType) {
    case '1h':
      return d;
    case '1d':
      d.setDate(d.getDate() + 30);
      return d;
    case 'week':
      d.setMonth(d.getMonth() + 3);
      return d;
    case 'month':
      d.setFullYear(d.getFullYear() + 1);
      return d;
    case 'custom':
      if (customConfig?.unit === 'day') d.setDate(d.getDate() + 30);
      else if (customConfig?.unit === 'month') d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 3);
      return d;
    default:
      return d;
  }
}

function stepDate(d: Date, repeatType: RepeatType): Date | null {
  const nd = new Date(d);
  switch (repeatType) {
    case '1h':
      nd.setHours(nd.getHours() + 1);
      break;
    case '1d':
      nd.setDate(nd.getDate() + 1);
      break;
    case 'week':
      nd.setDate(nd.getDate() + 7);
      break;
    case 'month':
      nd.setMonth(nd.getMonth() + 1);
      break;
    default:
      return null;
  }
  return nd;
}

function toOccurrence(d: Date) {
  return { date: toISO(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Simple fixed-interval stepping for custom day/month cadences (weekly-with-weekdays needs the matrix expansion below). */
function generateCustomFixedInterval(start: Date, config: CustomRepeatConfig, until: Date) {
  const out: { date: string; time: string }[] = [];
  let cur = new Date(start);
  let count = 0;
  while (cur <= until && count < REPEAT_CAP) {
    out.push(toOccurrence(cur));
    count++;
    const next = new Date(cur);
    if (config.unit === 'day') next.setDate(next.getDate() + config.interval);
    else next.setMonth(next.getMonth() + config.interval);
    cur = next;
  }
  return out;
}

/** Expands a custom "every N weeks on [weekdays]" rule into individual occurrences. */
function generateCustomWeekly(start: Date, config: CustomRepeatConfig, until: Date) {
  const weekdays = config.weekdays.length > 0 ? [...new Set(config.weekdays)].sort((a, b) => a - b) : [start.getDay()];
  const weekAnchor = new Date(start);
  weekAnchor.setDate(weekAnchor.getDate() - weekAnchor.getDay()); // Sunday of the start date's week
  weekAnchor.setHours(0, 0, 0, 0);

  const out: { date: string; time: string }[] = [];
  for (let cycle = 0; cycle < MAX_WEEK_CYCLES && out.length < REPEAT_CAP; cycle++) {
    const weekStart = new Date(weekAnchor);
    weekStart.setDate(weekStart.getDate() + cycle * 7 * config.interval);
    if (weekStart > until) break;

    for (const wd of weekdays) {
      const occ = new Date(weekStart);
      occ.setDate(occ.getDate() + wd);
      occ.setHours(start.getHours(), start.getMinutes(), 0, 0);
      if (occ < start || occ > until) continue;
      out.push(toOccurrence(occ));
      if (out.length >= REPEAT_CAP) break;
    }
  }
  out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return out;
}

/** Expands a repeat rule into individual {date, time} occurrences, capped at 150. */
export function generateRepeatOccurrences(
  dateISO: string,
  time: string,
  repeatType: RepeatType,
  untilISO: string,
  customConfig?: CustomRepeatConfig
) {
  const [h, m] = time.split(':').map(Number);
  const start = fromISO(dateISO);
  start.setHours(h, m, 0, 0);
  const until = fromISO(untilISO);
  until.setHours(23, 59, 59, 999);

  if (repeatType === 'custom' && customConfig) {
    return customConfig.unit === 'week'
      ? generateCustomWeekly(start, customConfig, until)
      : generateCustomFixedInterval(start, customConfig, until);
  }

  const out: { date: string; time: string }[] = [];
  let cur = start;
  let count = 0;
  while (cur <= until && count < REPEAT_CAP) {
    out.push(toOccurrence(cur));
    count++;
    const next = stepDate(cur, repeatType);
    if (!next) break;
    cur = next;
  }
  return out;
}
