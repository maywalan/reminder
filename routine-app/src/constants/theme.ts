/**
 * Design tokens ported from planner-app-prototype.html's `:root` / `body.dark-mode` CSS
 * variables, so the native app matches the prototype's palette exactly.
 */

export const Colors = {
  light: {
    bg: '#F5F5F7',
    surface: '#FFFFFF',
    surface2: '#FBFBFC',
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    textTertiary: '#AEAEB4',
    accent: '#5B5FEF',
    accentStrong: '#4749D6',
    accentSoft: 'rgba(91,95,239,0.12)',
    success: '#2FB463',
    successSoft: 'rgba(47,180,99,0.12)',
    danger: '#FF3B30',
    dangerSoft: 'rgba(255,59,48,0.10)',
    divider: 'rgba(60,60,67,0.10)',
    dividerStrong: 'rgba(60,60,67,0.16)',
    navbarBg: 'rgba(255,255,255,0.97)',
  },
  dark: {
    bg: '#000000',
    surface: '#1C1C1E',
    surface2: '#131315',
    text: '#F5F5F7',
    textSecondary: '#98989D',
    textTertiary: '#6C6C70',
    accent: '#7B7FFF',
    accentStrong: '#9195FF',
    accentSoft: 'rgba(123,127,255,0.20)',
    success: '#30D158',
    successSoft: 'rgba(48,209,88,0.16)',
    danger: '#FF453A',
    dangerSoft: 'rgba(255,69,58,0.16)',
    divider: 'rgba(255,255,255,0.13)',
    dividerStrong: 'rgba(255,255,255,0.22)',
    navbarBg: 'rgba(20,20,22,0.97)',
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeColorKey = keyof ThemeColors;

export const Radii = { sm: 10, md: 16, lg: 26 } as const;

/**
 * Canonical text sizes. Sizes had drifted into ~15 near-duplicate one-off values (14, 14.5, 15,
 * 15.5 all meant to read as the same "body" weight, etc.) — use these instead of a literal
 * `fontSize` for prose so the same kind of text reads the same size everywhere. Chip/pill labels
 * and Progress screen's big stat numbers are intentionally their own thing and sit outside this
 * scale.
 *
 * Every value here is scaled by the user's Settings > Font Size preference (see
 * `setFontScale`/`FONT_SCALE_OPTIONS`). `Typography` is a Proxy over the base sizes rather than a
 * plain object so every existing `Typography.body`-style read — including ones baked into a
 * module-level `StyleSheet.create()` at import time — re-evaluates against the current scale,
 * without having to convert 20+ files to a hook. The one thing that doesn't happen for free is
 * *re-rendering* already-mounted screens when the scale changes; `_layout.tsx` forces that by
 * remounting the navigator, keyed on the scale, whenever it changes.
 */
const BASE_TYPOGRAPHY = {
  display: 28, // screen-level date/greeting header
  title: 17, // sheet and modal titles ("New Plan", "Filter by Group")
  heading: 15, // primary emphasized text: row labels, input values, task/plan names
  body: 13, // secondary/meta text: times, descriptions, sub-labels
  label: 11.5, // all-caps section labels, small counts
} as const;

export type FontScale = 0.9 | 1 | 1.15 | 1.3;

export const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Default' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Extra Large' },
];

let currentFontScale: FontScale = 1;

export function setFontScale(scale: FontScale) {
  currentFontScale = scale;
}

export const Typography = new Proxy(BASE_TYPOGRAPHY, {
  get(target, prop: keyof typeof BASE_TYPOGRAPHY) {
    return target[prop] * currentFontScale;
  },
}) as typeof BASE_TYPOGRAPHY;

export const Spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 } as const;

/** Task/group/plan color swatches — red, orange, yellow, green, blue, purple, grey, in that order. */
export const SwatchColors = ['#FF3B30', '#FF9F43', '#FFC107', '#2FB463', '#2E86FF', '#9B59D0', '#6E6E73'] as const;

/** Display names for SwatchColors, keyed by hex — used anywhere a color needs a human label (e.g. Progress's by-color breakdown). */
export const SwatchColorNames: Record<string, string> = {
  '#FF3B30': 'Red',
  '#FF9F43': 'Orange',
  '#FFC107': 'Yellow',
  '#2FB463': 'Green',
  '#2E86FF': 'Blue',
  '#9B59D0': 'Purple',
  '#6E6E73': 'Grey',
};
