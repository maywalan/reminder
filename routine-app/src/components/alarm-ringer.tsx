import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Modal, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BellIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { ALARM_SOUND_ASSET } from '@/constants/alarm-sounds';
import { scaledFont, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { fmtTime } from '@/i18n/format';
import {
  ALARM_ACTION_SNOOZE,
  ALARM_ACTION_STOP,
  ALARM_SNOOZE_MINUTES,
  alarmDataOf,
  snoozeAlarm,
  type AlarmData,
} from '@/lib/notifications';

/** In-app rings stop on their own after this, like the 20 s notification sound does. */
const MAX_RING_MS = 60_000;
/** Ignore notification taps older than this (e.g. a response iOS kept from yesterday). */
const MAX_RESPONSE_AGE_MS = 30 * 60_000;

interface Ring {
  title: string;
  data: AlarmData;
  notificationId: string;
  at: Date;
  /** ringing: sound playing (app was open). tapped: opened from the notification, sound already stopped. snoozed: came in through the Snooze button. */
  mode: 'ringing' | 'tapped' | 'snoozed';
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Full-screen alarm (tester feedback, 2026-11-12: a ringing banner only stopped when swiped away).
 * - Alarm fires while Tickle is open: this screen rings instead of a banner (see setNotificationHandler).
 * - User taps the alarm notification: opening the app silences it; this screen offers Done / Snooze.
 * - User picks Snooze on the notification: Tickle opens, schedules the next ring, and confirms it here.
 * Mounted once in the root layout.
 */
export function AlarmRinger() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const player = useAudioPlayer(null);
  const [ring, setRing] = useState<Ring | null>(null);
  const handled = useRef(new Set<string>());
  const pulse = useRef(new Animated.Value(0)).current;

  const show = useCallback((n: Notifications.Notification, mode: Ring['mode']) => {
    const data = alarmDataOf(n.request.content.data);
    if (!data) return;
    setRing({ title: n.request.content.title ?? '', data, notificationId: n.request.identifier, at: new Date(), mode });
  }, []);

  const onResponse = useCallback(
    (r: Notifications.NotificationResponse) => {
      const key = `${r.notification.request.identifier}@${r.notification.date}:${r.actionIdentifier}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      Notifications.clearLastNotificationResponse();
      const data = alarmDataOf(r.notification.request.content.data);
      // iOS reports `date` in seconds (as of expo-notifications 0.32); accept milliseconds too.
      const firedMs = r.notification.date < 1e12 ? r.notification.date * 1000 : r.notification.date;
      if (!data || Date.now() - firedMs > MAX_RESPONSE_AGE_MS) return;
      if (r.actionIdentifier === ALARM_ACTION_STOP) return;
      if (r.actionIdentifier === ALARM_ACTION_SNOOZE) {
        snoozeAlarm(r.notification.request.content.title ?? '', data).catch(() => {});
        show(r.notification, 'snoozed');
        return;
      }
      show(r.notification, 'tapped');
    },
    [show]
  );

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((n) => {
      if (AppState.currentState === 'active') show(n, 'ringing');
    });
    const response = Notifications.addNotificationResponseReceivedListener(onResponse);
    // Cold start: the tap that launched Tickle arrived before this listener existed.
    const last = Notifications.getLastNotificationResponse();
    if (last) onResponse(last);
    return () => {
      received.remove();
      response.remove();
    };
  }, [show, onResponse]);

  const ringing = ring?.mode === 'ringing';

  // Sound + vibration while ringing.
  useEffect(() => {
    if (!ringing || !ring) return;
    let cancelled = false;
    setAudioModeAsync({ playsInSilentMode: true })
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        player.replace(ALARM_SOUND_ASSET[ring.data.sound]);
        player.loop = true;
        player.seekTo(0);
        player.play();
      });
    Vibration.vibrate();
    const buzz = setInterval(() => Vibration.vibrate(), 2000);
    const timeout = setTimeout(() => setRing((r) => (r && r.mode === 'ringing' ? { ...r, mode: 'tapped' } : r)), MAX_RING_MS);
    return () => {
      cancelled = true;
      clearInterval(buzz);
      clearTimeout(timeout);
      Vibration.cancel();
      player.pause();
    };
  }, [ringing, ring, player]);

  // Gentle bell wobble while ringing.
  useEffect(() => {
    if (!ringing) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ringing, pulse]);

  function close() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (ring) Notifications.dismissNotificationAsync(ring.notificationId).catch(() => {});
    setRing(null);
  }

  function snooze() {
    if (!ring) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    snoozeAlarm(ring.title, ring.data).catch(() => {});
    Notifications.dismissNotificationAsync(ring.notificationId).catch(() => {});
    setRing({ ...ring, mode: 'snoozed' });
  }

  if (!ring) return null;
  const rotate = pulse.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
  const timeText = fmtTime(`${pad(ring.at.getHours())}:${pad(ring.at.getMinutes())}`);
  const message =
    ring.mode === 'snoozed'
      ? t('alarm.snoozed', { n: ALARM_SNOOZE_MINUTES })
      : t(ring.data.kind === 'start' ? 'notif.alarmStart' : 'notif.alarmEnd');

  return (
    <Modal visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View
        accessibilityViewIsModal
        style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <Animated.View style={[styles.bell, { backgroundColor: theme.accentSoft, transform: [{ rotate }] }]}>
            <BellIcon size={34} color={theme.accentStrong} strokeWidth={2} />
          </Animated.View>
          <Text style={[styles.time, { color: theme.text }]} accessibilityRole="header">
            {timeText}
          </Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
            {ring.title}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accentFill, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <Text style={[styles.primaryText, { color: theme.onAccent }]}>{t(ringing ? 'alarm.stop' : 'alarm.done')}</Text>
          </Pressable>
          {ring.mode !== 'snoozed' && (
            <Pressable
              onPress={snooze}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, { backgroundColor: theme.accentSoft, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <Text style={[styles.secondaryText, { color: theme.accentStrong }]}>{t('alarm.snoozeFor', { n: ALARM_SNOOZE_MINUTES })}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  top: { alignItems: 'center' },
  bell: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  time: { fontSize: scaledFont(64), fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  title: { fontSize: Typography.screenTitle, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  message: { fontSize: Typography.heading, textAlign: 'center', marginTop: 6 },
  actions: { gap: 12 },
  primary: { height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: Typography.title, fontWeight: '700' },
  secondary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: Typography.heading, fontWeight: '700' },
});
