/** IANA timezone support for plans — lets a plan's date/time mean "wall-clock time in that zone" rather than always the device's current zone. */

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Shown by default in the timezone picker before the user searches, and used as the fallback list if the runtime can't enumerate every IANA zone. */
export const COMMON_TIME_ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Sao_Paulo', 'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Cairo', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta',
  'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland',
];

/** Every valid IANA zone the runtime knows about, or a curated fallback if `Intl.supportedValuesOf` isn't available. */
export function listTimeZones(): string[] {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  try {
    const zones = supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones;
  } catch {
    // fall through to the curated list below
  }
  return COMMON_TIME_ZONES;
}

/** "America/New_York" -> "New York". Falls back to the raw id for zones without a "/" (e.g. "UTC"). */
export function timeZoneCityLabel(tz: string): string {
  const city = tz.split('/').pop();
  return city ? city.replace(/_/g, ' ') : tz;
}

function offsetMinutesAt(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  // Intl reports hour 24 as "00" of the next nominal day in some engines; Date.UTC normalizes that fine either way.
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return (asUTC - date.getTime()) / 60_000;
}

/** Formats a zone's current UTC offset, e.g. "GMT-4" or "GMT+5:30". */
export function timeZoneOffsetLabel(tz: string, at: Date = new Date()): string {
  const minutes = offsetMinutesAt(at, tz);
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/**
 * The Date instant at which it is `time` wall-clock in `timeZone` on `dateISO`. Accurate outside
 * the handful of hours right around a DST transition in that zone — an accepted approximation for
 * a reminder app without pulling in a full timezone-database library.
 */
export function zonedWallTimeToDate(dateISO: string, time: string, timeZone: string): Date {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const offsetMin = offsetMinutesAt(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMin * 60_000);
}
