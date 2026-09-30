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

export function takePendingLiveActivityActions(): PendingLiveActivityAction[] {
  return native?.takePendingActions() ?? [];
}
