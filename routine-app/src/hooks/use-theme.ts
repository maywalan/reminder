/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from 'react';

import { accentTokens, AccentThemes, Colors, DEFAULT_ACCENT, PremiumColors, type AccentKey, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlannerStore } from '@/store/use-planner-store';

/** Resolves the user's Appearance setting against the system scheme (light/dark only, no 'no-preference'). */
export function useEffectiveScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const themeMode = usePlannerStore((s) => s.settings.themeMode);
  const effective = themeMode === 'system' ? systemScheme : themeMode;
  return effective === 'dark' ? 'dark' : 'light';
}

/** The user's colour theme (Profile > Settings > Theme colour): a preset id or `hue:<n>` for a custom colour. */
export function useAccentId(): AccentKey {
  const id = usePlannerStore((s) => s.settings.accentTheme);
  const hue = usePlannerStore((s) => s.settings.accentHue);
  if (id === 'custom') return Number.isFinite(hue) ? `hue:${Math.round(hue as number)}` : DEFAULT_ACCENT;
  return id && id in AccentThemes ? id : DEFAULT_ACCENT;
}

/** Palette for a scheme with the accent tokens swapped in. Also for code outside React (widgets excluded). */
export function themeColors(scheme: 'light' | 'dark', accent: AccentKey = DEFAULT_ACCENT): ThemeColors {
  return accent === DEFAULT_ACCENT ? Colors[scheme] : { ...Colors[scheme], ...accentTokens(accent, scheme) };
}

export function useTheme(): ThemeColors {
  const scheme = useEffectiveScheme();
  const accent = useAccentId();
  return useMemo(() => themeColors(scheme, accent), [scheme, accent]);
}

/** The Premium screens' extra colors (see `PremiumColors`) for the current Appearance. */
export function usePremiumColors() {
  return PremiumColors[useEffectiveScheme()];
}
