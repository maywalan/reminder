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
    textQuaternary: 'rgba(16,32,58,0.38)', // "ink-38" — inactive tab icon + label
    textFaint: 'rgba(16,32,58,0.3)', // "ink-30" — chevrons
    accent: '#1B76E8', // "azure-500" — fills, icon strokes, active states
    accentStrong: '#0F5FC4', // "azure-600" — every blue *word* (Save, Done, Log In, links)
    accentSoft: '#EAF2FE', // "azure-50" — icon tiles, selected chip fill, active tab pill
    accentLight: '#5AA0F5', // "azure-400" — FAB gradient end only
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
    textFaint: 'rgba(242,245,250,0.3)',
    accent: '#4C9AFB',
    accentStrong: '#7FB4FC',
    accentSoft: 'rgba(27,118,232,0.18)',
    accentLight: '#8FC1FE',
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

export type ThemeColors = typeof Colors.light;
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
  label: 11.5, // all-caps section labels, small counts
  // Tickle draft-2 type ramp (see design_handoff_tickle_draft2/README.md's Typography table).
  // Additive alongside the roles above so screens keep their existing sizing until their own
  // redesign PR adopts these.
  hero: 34, // hero / big stat
  screenTitle: 21, // screen title / name
  sheetTitle: 16, // sheet title
  headerDate: 16.5, // header date
  rowLabel: 13.5, // row label
  rowValue: 12.5, // row value (right-aligned, secondary)
  caption: 10, // section caption, uppercase
  tabLabel: 9.5, // tab bar label
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

export const Spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, cardGap: 9 } as const;

/**
 * Maps the four numeric `fontWeight`s the Tickle draft-2 type ramp uses to the loaded Anuphan
 * static font file for that weight (see `_layout.tsx`'s `useFonts`). RN doesn't synthesize bold
 * from a single custom font file the way it does for system fonts, so a custom-font `<Text>` needs
 * both `fontWeight` (for layout-time metrics) *and* the matching `fontFamily` from this map, or it
 * silently renders in whichever one weight happened to load. Google Fonts ships no ExtraBold/Black
 * cut of Anuphan (700 Bold is the heaviest static weight available), so 800 falls back to 700 Bold
 * — one step lighter than the design file's spec, the closest available match.
 */
export const Fonts = {
  500: 'Anuphan_500Medium',
  600: 'Anuphan_600SemiBold',
  700: 'Anuphan_700Bold',
  800: 'Anuphan_700Bold',
} as const;

/** Task/group/plan color swatches — the 7 plan hues from the Tickle draft-2 design tokens. */
export const SwatchColors = ['#7B61FF', '#A455D6', '#17A8A0', '#F0A32E', '#E86A7C', '#35B978', '#8A8FA3'] as const;

/** Display names for SwatchColors, keyed by hex — used anywhere a color needs a human label (e.g. Progress's by-color breakdown). */
export const SwatchColorNames: Record<string, string> = {
  '#7B61FF': 'Violet',
  '#A455D6': 'Orchid',
  '#17A8A0': 'Teal',
  '#F0A32E': 'Amber',
  '#E86A7C': 'Coral',
  '#35B978': 'Green',
  '#8A8FA3': 'Slate',
};
