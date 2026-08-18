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
  completed: boolean;
  color: string;
  groupId: string | null;
  repeatType: string;
  repeatId?: string;
  order?: number; // manual sort position within its date, set once the user drags to reorder
}

export interface Profile {
  name: string;
  avatarColor: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type AlertStyle = 'banners' | 'persistent';
export type Language = 'en' | 'th' | 'zh';

export interface Settings {
  notificationsEnabled: boolean;
  liveActivitiesEnabled: boolean;
  themeMode: ThemeMode;
  soundEnabled: boolean;
  badgesEnabled: boolean;
  alertStyle: AlertStyle;
  language: Language;
}
