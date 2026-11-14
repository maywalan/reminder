import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { lang } from '@/i18n';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

/** Free, no-key public holiday API (https://date.nager.at) — covers ~100 countries, not every region. */
const API_BASE = 'https://date.nager.at/api/v3/PublicHolidays';
// v2 (2026-11-14): regional holidays now filtered out, so older cached lists are ignored.
const CACHE_PREFIX = 'holiday-cache-v2:';

/**
 * Regions nager.date doesn't cover, read from Google Calendar's public holiday feeds instead (free,
 * no key, an iCal file per language). Thailand is Tickle's main market — the feed also carries the
 * lunar holidays (Makha Bucha, Visakha Bucha…) that move every year.
 */
const GOOGLE_FEEDS: Record<string, { en: string; th: string }> = {
  TH: { en: 'en.th', th: 'th.th' },
  // Not covered by nager.date (checked 2026-11-14). India, Malaysia and Taiwan use Google's older ids.
  IN: { en: 'en.indian', th: 'th.indian' },
  MY: { en: 'en.malaysia', th: 'th.malaysia' },
  TW: { en: 'en.taiwan', th: 'th.taiwan' },
  AE: { en: 'en.ae', th: 'th.ae' },
  SA: { en: 'en.sa', th: 'th.sa' },
  PK: { en: 'en.pk', th: 'th.pk' },
  LK: { en: 'en.lk', th: 'th.lk' },
  MM: { en: 'en.mm', th: 'th.mm' },
  LA: { en: 'en.la', th: 'th.la' },
  QA: { en: 'en.qa', th: 'th.qa' },
  KW: { en: 'en.kw', th: 'th.kw' },
  OM: { en: 'en.om', th: 'th.om' },
  JO: { en: 'en.jo', th: 'th.jo' },
  NP: { en: 'en.np', th: 'th.np' },
  BN: { en: 'en.bn', th: 'th.bn' },
  MV: { en: 'en.mv', th: 'th.mv' },
  BT: { en: 'en.bt', th: 'th.bt' },
  LB: { en: 'en.lb', th: 'th.lb' },
  IR: { en: 'en.ir', th: 'th.ir' },
  AF: { en: 'en.af', th: 'th.af' },
  TL: { en: 'en.tl', th: 'th.tl' },
};
// Feed events are tagged "Public holiday" or "Observance" (Valentine's, Christmas…) — keep only the former.
const PUBLIC_HOLIDAY_LABELS = ['Public holiday', 'วันหยุดนักขัตฤกษ์'];

export function deviceRegion(): string | null {
  return Localization.getLocales()[0]?.regionCode ?? null;
}

/**
 * Public holidays for a region/year, from cache when available. A region the API doesn't cover
 * (or any fetch failure) resolves to an empty list rather than throwing — holidays are a nice-to-
 * have, not something that should ever break the calendar screen. The empty result itself is
 * cached too, so an unsupported region doesn't get re-requested on every app open.
 */
export async function getHolidays(year: number, countryCode: string): Promise<Holiday[]> {
  if (GOOGLE_FEEDS[countryCode]) return getGoogleHolidays(year, countryCode);
  const cacheKey = `${CACHE_PREFIX}${countryCode}:${year}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // corrupt cache entry — fall through and refetch
  }

  try {
    const res = await fetch(`${API_BASE}/${year}/${countryCode}`);
    if (!res.ok) {
      await AsyncStorage.setItem(cacheKey, '[]');
      return [];
    }
    const raw: { date: string; localName: string; global?: boolean }[] = await res.json();
    // Nationwide holidays only: `global: false` ones apply to some states/regions (e.g. a US state's day).
    const holidays: Holiday[] = raw.filter((h) => h.global !== false).map((h) => ({ date: h.date, name: h.localName }));
    await AsyncStorage.setItem(cacheKey, JSON.stringify(holidays));
    return holidays;
  } catch {
    // offline, or the API is unreachable — no cache write, so it's retried next time instead of
    // permanently silenced by a transient network error.
    return [];
  }
}

/** Parses an iCal feed's all-day events into holidays, one per date (multi-day events expanded). */
export function parseHolidayFeed(ics: string): Holiday[] {
  // Unfold continuation lines (RFC 5545: a line starting with a space continues the previous one).
  const lines = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const out: Holiday[] = [];
  let ev: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') ev = {};
    else if (line === 'END:VEVENT' && ev) {
      const start = ev.DTSTART;
      // Nationwide only: the description's first line is exactly the label. "Public holiday in Sabah…"
      // (a state or regional day) and observances are left out.
      const firstLine = (ev.DESCRIPTION ?? '').split('\\n')[0].trim();
      const isPublic = PUBLIC_HOLIDAY_LABELS.includes(firstLine);
      if (start && ev.SUMMARY && isPublic) {
        const toDate = (v: string) => new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8));
        const end = ev.DTEND ? toDate(ev.DTEND) : null;
        for (let d = toDate(start); !end || d < end; d.setDate(d.getDate() + 1)) {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          out.push({ date: iso, name: ev.SUMMARY.replace(/\\([,;\\])/g, '$1').replace(/[\u200B-\u200D\uFEFF]/g, '').trim() });
          if (!end) break;
        }
      }
      ev = null;
    } else if (ev) {
      const m = line.match(/^([A-Z-]+)(?:;[^:]*)?:(.*)$/);
      if (m) ev[m[1]] = m[2];
    }
  }
  return out;
}

/**
 * Same contract as nager holidays above (cached per region/year, never throws), but the names
 * follow the app language, so the cache key carries it too.
 */
async function getGoogleHolidays(year: number, countryCode: string): Promise<Holiday[]> {
  const l = lang() === 'th' ? 'th' : 'en';
  const cacheKey = `${CACHE_PREFIX}google:${countryCode}:${l}:${year}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // corrupt cache entry — fall through and refetch
  }

  try {
    const id = encodeURIComponent(`${GOOGLE_FEEDS[countryCode][l]}#holiday@group.v.calendar.google.com`);
    const res = await fetch(`https://calendar.google.com/calendar/ical/${id}/public/basic.ics`);
    if (!res.ok) return [];
    const all = parseHolidayFeed(await res.text());
    // One fetch returns every year the feed has — cache each so the other years skip the network.
    const byYear = new Map<string, Holiday[]>();
    for (const h of all) {
      const y = h.date.slice(0, 4);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(h);
    }
    await AsyncStorage.multiSet([...byYear].map(([y, list]) => [`${CACHE_PREFIX}google:${countryCode}:${l}:${y}`, JSON.stringify(list)]));
    return byYear.get(String(year)) ?? [];
  } catch {
    // offline — retried next time, like the nager path
    return [];
  }
}
