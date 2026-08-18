/**
 * Location autocomplete via the Google Places API (New) "Autocomplete" endpoint — a plain HTTPS
 * call, so it works in Expo Go with no native map SDK. Requires an API key set as
 * EXPO_PUBLIC_GOOGLE_PLACES_API_KEY (see routine-app/README.md). Without a key, location stays a
 * plain free-text field.
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface PlaceSuggestion {
  id: string;
  primaryText: string;
  secondaryText: string;
}

export function isPlacesSearchAvailable() {
  return !!API_KEY;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (!API_KEY || !query.trim()) return [];

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
    body: JSON.stringify({ input: query }),
    signal,
  });
  if (!res.ok) return [];

  const data = await res.json();
  const suggestions: unknown[] = data.suggestions ?? [];
  return suggestions
    .map((s) => (s as { placePrediction?: Record<string, any> }).placePrediction)
    .filter((p): p is Record<string, any> => !!p)
    .map((p) => ({
      id: p.placeId,
      primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}
