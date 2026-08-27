import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

/** Free, no-key public holiday API (https://date.nager.at) — covers ~100 countries, not every region. */
const API_BASE = 'https://date.nager.at/api/v3/PublicHolidays';
const CACHE_PREFIX = 'holiday-cache:';

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
    const raw: { date: string; localName: string }[] = await res.json();
    const holidays: Holiday[] = raw.map((h) => ({ date: h.date, name: h.localName }));
    await AsyncStorage.setItem(cacheKey, JSON.stringify(holidays));
    return holidays;
  } catch {
    // offline, or the API is unreachable — no cache write, so it's retried next time instead of
    // permanently silenced by a transient network error.
    return [];
  }
}
