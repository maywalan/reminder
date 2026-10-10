import * as Localization from 'expo-localization';

import type { Language } from '@/store/types';
import { STRINGS, type StringKey } from './strings';

/** Languages with a full translation. Anything else (e.g. 'zh', not shipped yet) falls back to English. */
export type AppLang = 'en' | 'th';

/**
 * The phone's language, used as the default for a fresh install (user's call, 2026-10-10:
 * "follow the phone"). Profile > Language overrides it.
 */
export function deviceLanguage(): AppLang {
  return Localization.getLocales()[0]?.languageCode === 'th' ? 'th' : 'en';
}

let current: AppLang = 'en';

/**
 * Called by the root layout every render with the store's `settings.language`, before children
 * render — same pattern as `setFontScale`. The navigator is keyed on the language, so every
 * mounted screen re-renders with the new strings when it changes.
 */
export function setLanguage(lang: Language) {
  current = lang === 'th' ? 'th' : 'en';
}

export function lang(): AppLang {
  return current;
}

export type TParams = Record<string, string | number>;

/**
 * Looks up a UI string in the current language and fills `{name}`-style placeholders. With a
 * numeric `count` param, English picks the `<key>_one` variant when count is 1 (Thai has no
 * plural forms, so it always uses the base key).
 */
export function t(key: StringKey, params?: TParams): string {
  let entry = STRINGS[key];
  if (params && params.count === 1 && current === 'en') {
    const one = STRINGS[`${key}_one` as StringKey];
    if (one) entry = one;
  }
  let text = entry[current];
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}
