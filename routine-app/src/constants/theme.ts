import type { StringKey } from '@/i18n/strings';
/**
 * Design tokens ported from the "Tickle draft 2" handoff (docs/design_handoff_tickle_draft2 —
 * see its README.md for the full token table). Section 08 of that design file is the source of
 * truth for the light palette; dark-mode values below are this app's own extrapolation (the
 * handoff only specifies light) following the same semantic relationships as the palette it
 * replaces.
 *
 * Key names are kept stable across the redesign (bg/surface/text/accent/…) so every screen
 * keeps compiling as the six-screen rollout lands one PR at a time — only the values, plus a
 * handful of new additive keys (cardBorder, successBorder, dangerBorder, switchOff), changed.
 */

export const Colors = {
  light: {
    bg: '#F7FAFF', // "screen"
    surface: '#FFFFFF', // "card"
    surface2: '#FBFDFF',
    text: '#10203A', // "ink"
    textSecondary: 'rgba(16,32,58,0.5)', // "ink-50"
    textTertiary: 'rgba(16,32,58,0.42)', // "ink-42"
    textQuaternary: 'rgba(16,32,58,0.38)', // "ink-38"
    tabInactive: 'rgba(16,32,58,0.64)', // inactive tab icon + label — 5:1 on the white bar (critique, 2026-10-29)
    textFaint: 'rgba(16,32,58,0.3)', // "ink-30" — chevrons
    accent: '#1B76E8', // "azure-500" — fills, icon strokes, active states
    accentStrong: '#0F5FC4', // "azure-600" — every blue *word* (Save, Done, Log In, links)
    accentSoft: '#EAF2FE', // "azure-50" — icon tiles, selected chip fill, active tab pill
    accentLight: '#5AA0F5', // "azure-400" — FAB gradient end only
    accentBorder: '#E0EBFB', // blue-tinted card border — New Plan's Live Activity card only
    /** Text/icons drawn ON an accent fill (buttons, today circle). White except Mono in dark mode. */
    onAccent: '#FFFFFF',
    success: '#35B978',
    successLive: '#4FC98A', // live dot / running-session pulse
    successSoft: '#ECF7F1',
    successBorder: '#DCEDE4',
    due: '#F0A32E',
    dueSoft: '#FDF4E6',
    dueBorder: '#F6E6CE',
    danger: '#C0505F',
    dangerSoft: '#FBEDEF',
    dangerBorder: '#F3DADE',
    divider: '#F0F3F9', // hairline between rows inside a card
    dividerStrong: '#E7EDF6',
    cardBorder: '#E7EDF6', // 1pt card outline
    switchOff: '#E4E9F2',
    navbarBg: 'rgba(255,255,255,0.97)',
    toastBg: '#10203A',
  },
  dark: {
    bg: '#0A1220',
    surface: '#141D30',
    surface2: '#0F1728',
    text: '#F2F5FA',
    textSecondary: 'rgba(242,245,250,0.6)',
    textTertiary: 'rgba(242,245,250,0.45)',
    textQuaternary: 'rgba(242,245,250,0.38)',
    tabInactive: 'rgba(242,245,250,0.6)',
    textFaint: 'rgba(242,245,250,0.3)',
    accent: '#4C9AFB',
    accentStrong: '#7FB4FC',
    accentSoft: 'rgba(27,118,232,0.18)',
    accentLight: '#8FC1FE',
    accentBorder: 'rgba(76,154,251,0.28)',
    onAccent: '#FFFFFF',
    success: '#3FCB86',
    successLive: '#4FC98A',
    successSoft: 'rgba(63,203,134,0.14)',
    successBorder: 'rgba(63,203,134,0.28)',
    due: '#F3B458',
    dueSoft: 'rgba(240,163,46,0.14)',
    dueBorder: 'rgba(240,163,46,0.28)',
    danger: '#E2727F',
    dangerSoft: 'rgba(224,80,95,0.14)',
    dangerBorder: 'rgba(224,80,95,0.28)',
    divider: 'rgba(255,255,255,0.08)',
    dividerStrong: 'rgba(255,255,255,0.14)',
    cardBorder: 'rgba(255,255,255,0.12)',
    switchOff: 'rgba(255,255,255,0.16)',
    navbarBg: 'rgba(16,22,36,0.97)',
    toastBg: '#10203A',
  },
} as const;

/**
 * Extra colors for the Premium screens (paywall, Subscription, upgrade banner) — the handoffs
 * (design_handoff_tickle_paywall / _subscription) use a few mid-greys, a gold and a mint that the
 * main palette doesn't have. Dark values are this app's own extrapolation. The ink "Premium"
 * card stays dark in both modes; in dark mode it's lifted a step so it still reads as a card
 * against the near-black screen.
 */
export const PremiumColors = {
  light: {
    inkBody: '#3A4759', // feature rows, back chevron
    inkSub: '#4B5A70', // header subtitle, neutral badge text
    inkMuted: '#5A6A80', // period lines, fine print, billing labels
    inkFaint: '#8A99AC', // greyed-out list ticks
    link: 'rgba(16,32,58,0.72)', // Restore · Terms · Privacy
    chip: '#EEF3FA', // neutral badge, meter track, divider
    track: '#EAF0F9', // Monthly/Annual toggle track
    thumb: '#FFFFFF', // toggle thumb
    checkOff: '#D5E2F5', // unselected plan circle
    softButton: 'rgba(16,32,58,0.06)', // close / back circle
    rowDivider: '#F1F5FB',
    saveBg: '#F6EBD6',
    saveInk: '#8C6318',
    card: '#10203A', // ink Premium card / dark hero
    cardBorder: 'rgba(255,255,255,0.07)',
    cardInk: '#FFFFFF',
    cardInkBody: '#F2F7FD',
    cardInkSoft: '#C6D6EA',
    cardDivider: 'rgba(255,255,255,0.14)',
    gold: '#EFC985',
    goldBg: 'rgba(184,134,43,0.2)',
    goldBar: '#D9A356',
    mint: '#8FEAC4',
    mintBg: 'rgba(79,216,164,0.2)',
  },
  dark: {
    inkBody: 'rgba(242,245,250,0.82)',
    inkSub: 'rgba(242,245,250,0.7)',
    inkMuted: 'rgba(242,245,250,0.6)',
    inkFaint: 'rgba(242,245,250,0.4)',
    link: 'rgba(242,245,250,0.72)',
    chip: 'rgba(255,255,255,0.08)',
    track: 'rgba(255,255,255,0.08)',
    thumb: '#24324D',
    checkOff: 'rgba(255,255,255,0.25)',
    softButton: 'rgba(255,255,255,0.1)',
    rowDivider: 'rgba(255,255,255,0.08)',
    saveBg: 'rgba(240,163,46,0.18)',
    saveInk: '#F3C47A',
    card: '#17294A',
    cardBorder: 'rgba(255,255,255,0.1)',
    cardInk: '#FFFFFF',
    cardInkBody: '#F2F7FD',
    cardInkSoft: '#C6D6EA',
    cardDivider: 'rgba(255,255,255,0.14)',
    gold: '#EFC985',
    goldBg: 'rgba(184,134,43,0.24)',
    goldBar: '#D9A356',
    mint: '#8FEAC4',
    mintBg: 'rgba(79,216,164,0.2)',
  },
} as const;

/**
 * Free colour themes (tester feedback, 2026-11-11): the user picks one accent in Profile > Settings
 * and it replaces the five accent tokens below in both modes. Hand-picked per mode, not derived:
 * light `accent` carries white button text at >= blue's 4.37:1, `accentStrong` is text on white
 * at >= 5.9:1, and dark `accent` keeps white text at >= blue's 2.87:1 while standing >= 4.6:1 off
 * the dark surface. Backgrounds, plan colours, widgets and the Live Activity don't follow it.
 */
export type AccentId = 'blue' | 'indigo' | 'purple' | 'pink' | 'coral' | 'orange' | 'green' | 'teal' | 'mono';
type AccentTokens = {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentLight: string;
  accentBorder: string;
  /** Only Mono sets it (dark text on its white fill in dark mode); everything else keeps white. */
  onAccent?: string;
};

const accentSet = (
  light: [accent: string, strong: string, soft: string, lightEnd: string, border: string],
  dark: [accent: string, strong: string, lightEnd: string, rgb: string]
): { light: AccentTokens; dark: AccentTokens } => ({
  light: { accent: light[0], accentStrong: light[1], accentSoft: light[2], accentLight: light[3], accentBorder: light[4] },
  dark: { accent: dark[0], accentStrong: dark[1], accentSoft: `rgba(${dark[3]},0.18)`, accentLight: dark[2], accentBorder: `rgba(${dark[3]},0.28)` },
});

export const AccentThemes: Record<AccentId, { light: AccentTokens; dark: AccentTokens }> = {
  // Blue is the original palette above, kept identical (dark soft/border are tinted from azure-500).
  blue: {
    light: { accent: '#1B76E8', accentStrong: '#0F5FC4', accentSoft: '#EAF2FE', accentLight: '#5AA0F5', accentBorder: '#E0EBFB' },
    dark: { accent: '#4C9AFB', accentStrong: '#7FB4FC', accentSoft: 'rgba(27,118,232,0.18)', accentLight: '#8FC1FE', accentBorder: 'rgba(76,154,251,0.28)' },
  },
  indigo: accentSet(['#4F5BD5', '#3B45B0', '#EEEFFC', '#7C86E6', '#E3E5FA'], ['#7480EE', '#A7AEF7', '#B7BDFA', '116,128,238']),
  purple: accentSet(['#7B4FE0', '#6238C4', '#F2EDFD', '#9F7DF0', '#E8E0FB'], ['#9B7AF6', '#C4B0FC', '#CDBDFD', '155,122,246']),
  pink: accentSet(['#D13F7A', '#AE2A60', '#FCEDF3', '#E9739F', '#F8DEE9'], ['#E6609A', '#F6A5C4', '#F8B5CE', '230,96,154']),
  coral: accentSet(['#D24B42', '#B03C34', '#FCEEED', '#EC7F77', '#F8E0DE'], ['#E5675E', '#F7ACA6', '#F9BAB5', '229,103,94']),
  orange: accentSet(['#C25A08', '#9C4705', '#FDF1E6', '#E58A3A', '#F8E4D2'], ['#D9781F', '#F8C08A', '#FAC99A', '217,120,31']),
  green: accentSet(['#1E8A50', '#17703F', '#E9F6EF', '#45B97A', '#D7EEE1'], ['#2E9E62', '#7FDBAA', '#8EE0B5', '46,158,98']),
  teal: accentSet(['#0E8585', '#0B6A6A', '#E6F5F5', '#3DB3B3', '#D3ECEC'], ['#1C9A9A', '#7AD7D7', '#8ADCDC', '28,154,154']),
  // Monochrome (2026-11-11): black fills with white text in light mode, white fills with ink text in
  // dark mode. The one accent whose on-accent colour flips, hence the onAccent token.
  mono: {
    light: { accent: '#161B26', accentStrong: '#0B0E14', accentSoft: '#EDEFF3', accentLight: '#4A5262', accentBorder: '#E1E4EA', onAccent: '#FFFFFF' },
    dark: {
      accent: '#F2F5FA',
      accentStrong: '#FFFFFF',
      accentSoft: 'rgba(242,245,250,0.12)',
      accentLight: '#C5CBD6',
      accentBorder: 'rgba(242,245,250,0.22)',
      onAccent: '#0A1220',
    },
  },
};
export const ACCENT_IDS = Object.keys(AccentThemes) as AccentId[];
export const DEFAULT_ACCENT: AccentId = 'blue';

/* ---------- Custom accent from a hue (2026-11-11, Theme colour slider) ----------
 * The user only picks a hue; brightness is chosen here by WCAG contrast so every hue stays as
 * readable as the presets: light = white text on the accent >= 4.5:1, dark = the accent as text on
 * the dark card >= 4.7:1 (then white on it is as high as that allows). */

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Lightest (light mode) or darkest (dark mode) lightness, in 0.005 steps, that still meets `ok`. */
function pickLightness(h: number, s: number, ok: (hex: string) => boolean, fromLight: boolean): number {
  for (let i = 0; i <= 200; i++) {
    const l = fromLight ? 0.6 - i * 0.003 : 0.35 + i * 0.003;
    if (ok(hslToHex(h, s, l))) return l;
  }
  return fromLight ? 0.3 : 0.75;
}

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

export function hueAccent(hue: number): { light: AccentTokens; dark: AccentTokens } {
  const h = ((Math.round(hue) % 360) + 360) % 360;
  const s = 0.72;
  const lightL = pickLightness(h, s, (c) => contrast('#FFFFFF', c) >= 4.5, true);
  const strongL = pickLightness(h, s, (c) => contrast('#FFFFFF', c) >= 6.2, true);
  const darkL = pickLightness(h, s, (c) => contrast(Colors.dark.surface, c) >= 4.7, false);
  const darkAccent = hslToHex(h, s, darkL);
  return {
    light: {
      accent: hslToHex(h, s, lightL),
      accentStrong: hslToHex(h, s, strongL),
      accentSoft: hslToHex(h, 0.8, 0.955),
      accentLight: hslToHex(h, s, Math.min(lightL + 0.14, 0.7)),
      accentBorder: hslToHex(h, 0.6, 0.915),
    },
    dark: {
      accent: darkAccent,
      accentStrong: hslToHex(h, 0.85, Math.min(darkL + 0.17, 0.85)),
      accentSoft: `rgba(${rgbOf(darkAccent)},0.18)`,
      accentLight: hslToHex(h, 0.85, Math.min(darkL + 0.2, 0.88)),
      accentBorder: `rgba(${rgbOf(darkAccent)},0.28)`,
    },
  };
}

/** A saved accent: a preset id, or `hue:<0-359>` for a custom slider colour. */
export type AccentKey = AccentId | `hue:${number}`;

export function accentTokens(key: AccentKey, scheme: 'light' | 'dark'): AccentTokens {
  if (key.startsWith('hue:')) return hueAccent(Number(key.slice(4)))[scheme];
  return AccentThemes[key as AccentId][scheme];
}

export type PremiumPalette = (typeof PremiumColors)['light'] | (typeof PremiumColors)['dark'];

/** A full palette (either mode, any accent). Values widened to string so accents can be swapped in. */
export type ThemeColors = { readonly [K in keyof typeof Colors.light]: string };
export type ThemeColorKey = keyof ThemeColors;

export const Radii = {
  sm: 10,
  md: 16,
  lg: 26, // sheet top corners
  card: 20,
  button: 18,
  chip: 14,
  iconTile: 10,
  switchTrack: 13,
  // Large content surfaces (Calendar's month grid card) — measured off the live design file,
  // not in the README's own radius table, but consistent across every month-card instance there.
  panel: 24,
  // Progress screen's secondary white cards (chart, streak, by-color) — same provenance as
  // `panel`: not in the README's radius table, but consistent across every one of those cards.
  subcard: 22,
} as const;

/** Row min-height + touch target floor from the Tickle draft-2 spacing spec. */
export const RowMinHeight = 46;
export const TouchMin = 44;

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
  label: 12, // all-caps section labels, small counts
  // Tickle draft-2 type ramp (see design_handoff_tickle_draft2/README.md's Typography table).
  // Additive alongside the roles above so screens keep their existing sizing until their own
  // redesign PR adopts these.
  hero: 34, // hero / big stat
  screenTitle: 21, // screen title / name
  sheetTitle: 16, // sheet title
  headerDate: 16.5, // header date
  rowLabel: 13.5, // row label
  rowValue: 13, // row value (right-aligned, secondary); same as body
  caption: 12, // section caption, uppercase; same as label
  tabLabel: 12, // tab bar label
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

/**
 * No text in the app is drawn smaller than this, even at Settings > Font Size "Small" (user,
 * 2026-11-01, following Impeccable's 12pt minimum). The ramp's smallest steps (label, caption,
 * tabLabel) sit on it.
 */
export const MIN_FONT_SIZE = 12;

/** `size` scaled by the user's font-size setting, never below MIN_FONT_SIZE. */
export function scaledFont(size: number) {
  return Math.max(MIN_FONT_SIZE, size * currentFontScale);
}

export const Typography = new Proxy(BASE_TYPOGRAPHY, {
  get(target, prop: keyof typeof BASE_TYPOGRAPHY) {
    return scaledFont(target[prop]);
  },
}) as typeof BASE_TYPOGRAPHY;

export const Spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, cardGap: 9 } as const;

/**
 * Maps the numeric `fontWeight`s the Tickle draft-2 type ramp uses to the loaded Anuphan
 * static font file for that weight (see `_layout.tsx`'s `useFonts`). RN doesn't synthesize bold
 * from a single custom font file the way it does for system fonts, so a custom-font `<Text>` needs
 * both `fontWeight` (for layout-time metrics) *and* the matching `fontFamily` from this map, or it
 * silently renders in whichever one weight happened to load. Google Fonts ships no ExtraBold/Black
 * cut of Anuphan (700 Bold is the heaviest static weight available), so 800 falls back to 700 Bold
 * — one step lighter than the design file's spec, the closest available match.
 */
export const Fonts = {
  400: 'Anuphan_400Regular',
  500: 'Anuphan_500Medium',
  600: 'Anuphan_600SemiBold',
  700: 'Anuphan_700Bold',
  800: 'Anuphan_700Bold',
} as const;

/** Task/group/plan color swatches — the 7 plan hues from the Tickle draft-2 design tokens, plus azure. */
export const SwatchColors = ['#7B61FF', '#A455D6', '#17A8A0', '#F0A32E', '#E86A7C', '#35B978', '#8A8FA3', '#1B76E8'] as const;

/** Display-name string keys for SwatchColors, keyed by hex — used anywhere a color needs a human label (e.g. Progress's by-color breakdown). */
export const SwatchColorNames: Record<string, StringKey> = {
  '#7B61FF': 'color.violet',
  '#A455D6': 'color.orchid',
  '#17A8A0': 'color.teal',
  '#F0A32E': 'color.amber',
  '#E86A7C': 'color.coral',
  '#35B978': 'color.green',
  '#8A8FA3': 'color.slate',
  '#1B76E8': 'color.azure',
};

/** Default color for a newly created task — azure-500, matching the app's own accent color. */
export const DefaultTaskColor = SwatchColors[7];
