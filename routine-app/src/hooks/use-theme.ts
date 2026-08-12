/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlannerStore } from '@/store/use-planner-store';

/** Resolves the user's Appearance setting against the system scheme (light/dark only, no 'no-preference'). */
export function useEffectiveScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const themeMode = usePlannerStore((s) => s.settings.themeMode);
  const effective = themeMode === 'system' ? systemScheme : themeMode;
  return effective === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useEffectiveScheme()];
}
