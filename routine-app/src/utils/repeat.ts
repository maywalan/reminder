import { fromISO, pad, toISO } from '@/utils/dates';

/** Repeat rules ported verbatim from planner-app-prototype.html. */

export type RepeatType = 'none' | '1h' | '2h' | '3h' | '6h' | '1d' | '2d' | 'week' | 'month' | '2month' | '3month';

export const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: '1h', label: 'Every 1 hour' },
  { value: '2h', label: 'Every 2 hours' },
  { value: '3h', label: 'Every 3 hours' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '1d', label: 'Every 1 day' },
  { value: '2d', label: 'Every 2 days' },
  { value: 'week', label: 'Every week' },
  { value: 'month', label: 'Every month' },
  { value: '2month', label: 'Every 2 months' },
  { value: '3month', label: 'Every 3 months' },
];

const REPEAT_CAP = 150;

/**
 * A sensible default "repeat until" date for a freshly-picked repeat type, so simply choosing
 * "Every week" and saving already produces a repeating series instead of defaulting to the same
 * day as the start date (which would generate exactly one occurrence — effectively no repeat).
 * Hour-based cadences default to the same day, since several occurrences already fit within it.
 */
export function defaultRepeatUntil(start: Date, repeatType: RepeatType): Date {
  const d = new Date(start);
  switch (repeatType) {
    case '1h':
    case '2h':
    case '3h':
    case '6h':
      return d;
    case '1d':
    case '2d':
      d.setDate(d.getDate() + 30);
      return d;
    case 'week':
      d.setMonth(d.getMonth() + 3);
      return d;
    case 'month':
    case '2month':
    case '3month':
      d.setFullYear(d.getFullYear() + 1);
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
    case '2h':
      nd.setHours(nd.getHours() + 2);
      break;
    case '3h':
      nd.setHours(nd.getHours() + 3);
      break;
    case '6h':
      nd.setHours(nd.getHours() + 6);
      break;
    case '1d':
      nd.setDate(nd.getDate() + 1);
      break;
    case '2d':
      nd.setDate(nd.getDate() + 2);
      break;
    case 'week':
      nd.setDate(nd.getDate() + 7);
      break;
    case 'month':
      nd.setMonth(nd.getMonth() + 1);
      break;
    case '2month':
      nd.setMonth(nd.getMonth() + 2);
      break;
    case '3month':
      nd.setMonth(nd.getMonth() + 3);
      break;
    default:
      return null;
  }
  return nd;
}

/** Expands a repeat rule into individual {date, time} occurrences, capped at 150. */
export function generateRepeatOccurrences(dateISO: string, time: string, repeatType: RepeatType, untilISO: string) {
  const [h, m] = time.split(':').map(Number);
  let cur = fromISO(dateISO);
  cur.setHours(h, m, 0, 0);
  const until = fromISO(untilISO);
  until.setHours(23, 59, 59, 999);

  const out: { date: string; time: string }[] = [];
  let count = 0;
  while (cur <= until && count < REPEAT_CAP) {
    out.push({ date: toISO(cur), time: `${pad(cur.getHours())}:${pad(cur.getMinutes())}` });
    count++;
    const next = stepDate(cur, repeatType);
    if (!next) break;
    cur = next;
  }
  return out;
}
