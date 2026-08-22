/**
 * Location autocomplete via OpenStreetMap's Nominatim search API — free, no API key, no signup.
 * Works in Expo Go with no native map SDK. The public instance rate-limits to ~1 request/sec,
 * which the debounce in use-place-search.ts already respects.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export interface PlaceSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
}

export function isPlacesSearchAvailable() {
  return true;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];

  const url = `${ENDPOINT}?format=jsonv2&addressdetails=0&limit=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RoutineApp/1.0 (personal Expo app)', Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return [];

  const data: { place_id: number; display_name: string }[] = await res.json();
  return data.map((p) => {
    const [primaryText, ...rest] = p.display_name.split(', ');
    return { id: String(p.place_id), primaryText, secondaryText: rest.join(', ') };
  });
}
