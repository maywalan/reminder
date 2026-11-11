import type { FontScale } from '@/constants/theme';

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface Plan {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h) — start time (kept as a nominal value when allDay is true)
  endTime?: string; // HH:MM (24h) — set when the plan uses a time range instead of one specific time
  allDay?: boolean;
  alerts: string[]; // minutes-before offsets (e.g. '0','5','15'), up to 5, no duplicates
  notes?: string;
  location?: string;
  photoUris?: string[]; // up to 3
  live: boolean;
  /** Minutes before the start that the Live Activity countdown appears; unset = LIVE_LEAD_DEFAULT_MIN. */
  liveLeadMinutes?: number;
  /** Rings like an alarm at the start (and at the end of a time range). Unset = off. 2026-11-11. */
  alarm?: boolean;
  /** Which bundled sound the alarm plays; unset = DEFAULT_ALARM_SOUND. */
  alarmSound?: import('@/constants/alarm-sounds').AlarmSoundId;
  completed: boolean;
  /** When it was last checked off (epoch ms) — Home's Earlier list shows "done 06:34". */
  completedAt?: number;
  /** A PlanIconId (src/utils/plan-icons.ts) the user picked; unset = suggested from the title. */
  icon?: string;
  /** IANA zone the date/time is wall-clock-in — e.g. a 9am flight always means 9am at the airport's zone. Undefined = device's current zone (legacy plans, and the common case). */
  timezone?: string;
  color: string;
  groupId: string | null;
  repeatType: string;
  repeatId?: string;
  order?: number; // manual sort position within its date, set once the user drags to reorder
}

export interface Profile {
  name: string;
  avatarColor: string;
  /** File name of a profile photo in Documents/avatar (utils/avatar-photo). This phone only; not synced. */
  photo?: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type AlertStyle = 'banners' | 'persistent';
export type Language = 'en' | 'th' | 'zh';

/** Entitlement state for the Subscription status screen — see `mockSubscriptionState` on the planner store. */
export type SubscriptionState = 'trial' | 'monthly' | 'annual' | 'ending' | 'free';

/** What StoreKit last reported about the active Premium subscription (epoch ms). */
export interface SubscriptionDetails {
  productId: string;
  /** Start of the current billing period (or of the trial). */
  periodStart: number;
  /** When the current period ends — renewal date, or the last day of Premium once cancelled. */
  expiresAt: number | null;
}

export interface Settings {
  notificationsEnabled: boolean;
  liveActivitiesEnabled: boolean;
  themeMode: ThemeMode;
  soundEnabled: boolean;
  badgesEnabled: boolean;
  alertStyle: AlertStyle;
  language: Language;
  fontScale: FontScale;
  recapEnabled: boolean;
  recapHour: number; // 0-23, local time
  /** 0-59, local time. Optional because saves from before 2026-11-02 lack it; read with `?? 0`. */
  recapMinute?: number;
  /** Free colour theme (2026-11-11). Optional: older saves lack it; read with `?? DEFAULT_ACCENT`. Local only, not synced. */
  accentTheme?: import('@/constants/theme').AccentId | 'custom';
  /** Hue (0–359) for accentTheme 'custom', from the Theme colour slider. Phone-only like accentTheme. */
  accentHue?: number;
}
