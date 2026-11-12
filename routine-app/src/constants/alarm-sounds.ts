import type { StringKey } from '@/i18n/strings';

/**
 * Tickle's own alarm sounds (2026-11-11). Apps can't use the iPhone's built-in ringtones, so these
 * ship in the app: synthesised locally (no downloads, no licences), 8 s IMA4 CAF each (shortened from 20 s, user 2026-11-12), under
 * iOS's 30 s notification-sound limit. Bundled for notifications via the expo-notifications
 * plugin's `sounds` list in app.json — a new sound needs a native build, not a quick update.
 */
export const ALARM_SOUNDS = ['chime', 'classic', 'beep', 'marimba', 'rise', 'pulse'] as const;
export type AlarmSoundId = (typeof ALARM_SOUNDS)[number];
export const DEFAULT_ALARM_SOUND: AlarmSoundId = 'chime';

/** File name as iOS looks it up in the app bundle (notification `sound`, AlarmKit sound name). */
export const alarmSoundFile = (id: AlarmSoundId) => `tickle_${id}.caf`;

export const ALARM_SOUND_LABEL: Record<AlarmSoundId, StringKey> = {
  chime: 'alarm.sound.chime',
  classic: 'alarm.sound.classic',
  beep: 'alarm.sound.beep',
  marimba: 'alarm.sound.marimba',
  rise: 'alarm.sound.rise',
  pulse: 'alarm.sound.pulse',
};

/** For the picker's preview button (expo-audio needs a require()d asset). */
export const ALARM_SOUND_ASSET: Record<AlarmSoundId, number> = {
  chime: require('../../assets/sounds/tickle_chime.caf'),
  classic: require('../../assets/sounds/tickle_classic.caf'),
  beep: require('../../assets/sounds/tickle_beep.caf'),
  marimba: require('../../assets/sounds/tickle_marimba.caf'),
  rise: require('../../assets/sounds/tickle_rise.caf'),
  pulse: require('../../assets/sounds/tickle_pulse.caf'),
};

export function isAlarmSound(v: unknown): v is AlarmSoundId {
  return typeof v === 'string' && (ALARM_SOUNDS as readonly string[]).includes(v);
}
