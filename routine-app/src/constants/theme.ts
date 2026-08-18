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

export const Spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 } as const;

/** Same palette used for task/group color swatches in the prototype. */
export const SwatchColors = [
  '#5B5FEF', '#2E86FF', '#17A2B8', '#009688', '#2FB463', '#8BC34A', '#FFC107', '#FF9F43',
  '#FF6F61', '#FF3B30', '#E91E8C', '#FF6482', '#9B59D0', '#8D6E63', '#34495E', '#6E6E73',
] as const;
