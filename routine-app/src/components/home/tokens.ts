import { useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { Fonts, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';

/**
 * Home-screen tokens from design_handoff_tickle_home_7/README.md ("Design tokens"). Light values
 * are the handoff's own; dark values are this app's extrapolation (the handoff is light-only),
 * built on the existing dark theme in constants/theme.ts.
 */
export function useHomeTokens() {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  return useMemo(
    () => ({
      dark,
      ink: theme.text,
      ink50: theme.textSecondary,
      ink40: dark ? 'rgba(242,245,250,0.4)' : 'rgba(16,32,58,0.4)',
      ink38: theme.textQuaternary,
      page: dark ? theme.bg : '#F5F7FA',
      sheet: theme.surface,
      sheetBorder: dark ? theme.cardBorder : '#E9EEF6',
      rail: dark ? 'rgba(255,255,255,0.1)' : '#E9EEF6',
      checkRing: dark ? 'rgba(242,245,250,0.28)' : '#CFD7E3',
      link: theme.accentStrong,
      primary: theme.accent,
      nowLine: dark ? 'rgba(76,154,251,0.35)' : '#CFE0F8',
      liveDot: '#35B978',
      doneDot: '#35B978',
      missedDot: '#E0616F',
      missedText: dark ? '#EE8A95' : '#C24A57',
      donePillBg: dark ? theme.surface2 : '#FFFFFF',

      // design_handoff_tickle_home_timeline — week strip + feed.
      ink55: dark ? 'rgba(242,245,250,0.55)' : 'rgba(16,32,58,0.55)',
      ink45: dark ? 'rgba(242,245,250,0.45)' : 'rgba(16,32,58,0.45)',
      ink60: dark ? 'rgba(242,245,250,0.6)' : 'rgba(16,32,58,0.6)',
      azure: theme.accent,
      azureDark: theme.accentStrong,
      azureTint: theme.accentSoft,
      green: dark ? '#3FCB86' : '#35B978',
      rose: dark ? '#EE8A95' : '#C24A57',
      roseMark: dark ? '#EE8A95' : '#E0616F',
      roseRing: dark ? 'rgba(240,160,168,0.6)' : '#F0A0A8',
      navBorder: dark ? theme.cardBorder : '#E3EAF4',
      cell: theme.surface,
      dayDot: dark ? 'rgba(160,185,225,0.55)' : '#B3C3DE',
      railPast: dark ? '#3FCB86' : '#35B978',
      railFuture: dark ? 'rgba(255,255,255,0.16)' : '#D3DBE7',
      checkEdge: dark ? 'rgba(242,245,250,0.28)' : '#DDE3EE',
      upcomingRow: dark ? theme.surface2 : '#F9FBFF',
      upcomingBorder: dark ? theme.cardBorder : '#EDF2FA',
      earlierBorder: dark ? theme.divider : '#F1F4FA',
    }),
    [theme, dark]
  );
}

export type HomeTokens = ReturnType<typeof useHomeTokens>;

/**
 * The handoff's type ramp, scaled by the user's Settings > Font Size (Typography.body is 13 × the
 * current scale). Built at render time rather than in a module-level StyleSheet so a scale change
 * takes effect on the next render.
 */
export function useHomeType() {
  const k = Typography.body / 13;
  return useMemo(() => {
    const t = (size: number, weight: 500 | 600 | 700 | 400 = 400): TextStyle => ({
      fontSize: size * k,
      fontWeight: String(weight) as TextStyle['fontWeight'],
      fontFamily: Fonts[weight],
    });
    return {
      todayHeading: { ...t(18, 700), letterSpacing: -0.2 },
      greeting: { ...t(17, 700), letterSpacing: -0.3 },
      todayDate: t(13, 500),

      // design_handoff_tickle_home_timeline type ramp.
      // Scaled down ~15–20% from the handoff's sizes (user, 2026-10-18: "way too large"), with a 12pt
      // floor so Thai stays readable at a glance (critique, 2026-10-28).
      weekNo: t(14, 700),
      weekRange: t(14, 500),
      chip: t(12, 600),
      dayCap: t(12, 500),
      dayNum: t(16.5, 700),
      tlTime: t(12, 600),
      nowPill: t(12, 700),
      cardTitle: { ...t(13.5, 700), letterSpacing: -0.2 },
      cardSub: t(12, 500),
      cardSubStrong: t(12, 700),
      blockTitle: t(15, 700),
      blockTitleDate: t(15, 500),
      blockNote: t(12, 500),
      blockLink: t(12, 600),
      groupLabel: t(12, 600),
      upTitle: t(13, 600),
      upSub: t(12, 500),
      timeChip: t(12, 700),
      pastTitle: t(12.5, 500),
      pastMeta: t(12, 500),
      sumLabel: t(12, 500),
      sumCount: { ...t(15, 700), letterSpacing: -0.2 },
      title: t(13.5, 600),
      countdown: t(13, 600),
      smallTitle: t(12.5),
      sectionLabel: t(12, 600),
      railTime: t(12, 600),
      button: t(12, 600),
      meta: t(12),
      metaStrong: t(12, 600),
      link: t(12, 600),
      endTime: t(12),
      dayLabel: t(12, 600),
      nowTime: t(12, 600),
    };
  }, [k]);
}

export interface PlanPalette {
  /** Rails and markers. */
  base: string;
  /** Plan-name and countdown text. */
  text: string;
  /** Live card fill. */
  cardTint: string;
  /** Range bar fill. */
  barTint: string;
  /** Live progress track. */
  track: string;
  /** Live card Done pill border + label. */
  pillBorder: string;
  pillText: string;
}

/** Exact values from the handoff's plan-colour table, keyed by base colour. */
const DESIGN_PALETTES: Record<string, Partial<PlanPalette>> = {
  '#7B61FF': { text: '#5A43D6', cardTint: '#F6F4FF', track: '#E4DFFB', pillBorder: '#CFC6F7', pillText: '#3B2A9E' },
  '#A455D6': { text: '#8338B8', barTint: '#F1E6FA' },
  '#17A8A0': { text: '#0E7F79' },
  '#35B978': { text: '#1E8A55' },
  '#E08A2E': { text: '#A55A12', barTint: '#FCEBD8' },
};

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Opaque blend of `color` over `onto` at `amount` (0 = all `onto`, 1 = all `color`). */
function mix(color: string, onto: string, amount: number): string {
  const a = parseHex(color);
  const b = parseHex(onto);
  if (!a || !b) return color;
  const c = a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Every plan colour's text/tint/track variants. The five colours the handoff specifies use its
 * exact values in light mode; any other swatch (amber, coral, slate, azure, …) is derived with
 * the same ratios those five were measured at.
 */
export function planPalette(base: string, dark: boolean): PlanPalette {
  const surface = dark ? '#141D30' : '#FFFFFF';
  const derived: PlanPalette = {
    base,
    text: dark ? mix(base, '#FFFFFF', 0.75) : mix(base, '#10203A', 0.72),
    cardTint: mix(base, surface, dark ? 0.16 : 0.07),
    barTint: mix(base, surface, dark ? 0.3 : 0.15),
    track: mix(base, surface, dark ? 0.3 : 0.2),
    pillBorder: mix(base, surface, dark ? 0.45 : 0.35),
    pillText: dark ? mix(base, '#FFFFFF', 0.6) : mix(base, '#10203A', 0.55),
  };
  if (dark) return derived;
  return { ...derived, ...DESIGN_PALETTES[base.toUpperCase()] };
}
