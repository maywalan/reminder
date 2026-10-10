import { requireOptionalNativeModule } from 'expo-modules-core';

export interface LiveActivityPayload {
  planId: string;
  title: string;
  groupName?: string;
  baseHex: string;
  textHex: string;
  tintHex: string;
  trackHex: string;
  pillBorderHex: string;
  pillTextHex: string;
  phase: 'upcoming' | 'live';
  startMs: number;
  endMs?: number;
}

export interface PendingLiveActivityAction {
  action: 'complete' | 'extend';
  planId: string;
  at: string;
}

interface NativeModule {
  isSupported(): boolean;
  sync(payload: LiveActivityPayload | null): Promise<void>;
  takePendingActions(): PendingLiveActivityAction[];
  setWidgetData(appGroup: string, language: string, calendarJson: string): void;
}

// Optional: null on Android, in Expo Go, and in any dev-client build made before this module
// existed — every caller must treat Live Activities as simply unavailable then.
const native = requireOptionalNativeModule<NativeModule>('TickleLiveActivity');

export function isLiveActivitySupported(): boolean {
  return native?.isSupported() ?? false;
}

export async function syncLiveActivity(payload: LiveActivityPayload | null): Promise<void> {
  await native?.sync(payload);
}

/** Writes the widgets' calendar data into the App Group and reloads every widget. No-op where the module is missing. */
export function setWidgetData(appGroup: string, language: string, calendar: { plans: unknown[]; holidays: Record<string, string> }) {
  native?.setWidgetData(appGroup, language, JSON.stringify(calendar));
}

export function takePendingLiveActivityActions(): PendingLiveActivityAction[] {
  return native?.takePendingActions() ?? [];
}
