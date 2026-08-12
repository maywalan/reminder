export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface Plan {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  alert: string;
  live: boolean;
  completed: boolean;
  color: string;
  groupId: string | null;
  repeatType: string;
  repeatId?: string;
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
