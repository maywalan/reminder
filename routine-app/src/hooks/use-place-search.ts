import { useEffect, useState } from 'react';

import { isPlacesSearchAvailable, searchPlaces, type PlaceSuggestion } from '@/utils/places';

/** Debounced Google Places autocomplete for a query string; empty results when no API key is set. */
export function usePlaceSearch(query: string) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPlacesSearchAvailable() || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setSuggestions(results);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, loading };
}
