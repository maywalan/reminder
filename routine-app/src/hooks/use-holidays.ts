import { useEffect, useState } from 'react';

import { deviceRegion, getHolidays, type Holiday } from '@/lib/holidays';

/** date (YYYY-MM-DD) -> holiday name, for the given year. Empty if the device's region isn't covered by the holiday API, or nothing has loaded yet. */
export function useHolidays(year: number): Record<string, string> {
  const [byDate, setByDate] = useState<Record<string, string>>({});

  useEffect(() => {
    const region = deviceRegion();
    if (!region) return;
    let cancelled = false;

    getHolidays(year, region).then((holidays: Holiday[]) => {
      if (cancelled) return;
      setByDate(Object.fromEntries(holidays.map((h) => [h.date, h.name])));
    });

    return () => {
      cancelled = true;
    };
  }, [year]);

  return byDate;
}
