import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon, PlayIcon, StopIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { ALARM_SOUND_ASSET, ALARM_SOUND_LABEL, ALARM_SOUNDS, type AlarmSoundId } from '@/constants/alarm-sounds';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

interface Props {
  visible: boolean;
  value: AlarmSoundId;
  onChange: (id: AlarmSoundId) => void;
  onClose: () => void;
}

/**
 * Alarm sound picker (2026-11-11). Tapping a row picks it and plays a preview; tapping the playing
 * row again stops it. Preview stops when the sheet closes so nothing keeps ringing behind it.
 */
export function AlarmSoundSheet({ visible, value, onChange, onClose }: Props) {
  const theme = useTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [previewing, setPreviewing] = useState<AlarmSoundId | null>(null);
  const playing = previewing !== null && status.playing;

  useEffect(() => {
    // Let the preview be heard with the ring/silent switch on, like the Clock app's sound picker.
    if (visible) setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    else {
      player.pause();
      setPreviewing(null);
    }
  }, [visible, player]);

  function tap(id: AlarmSoundId) {
    onChange(id);
    if (previewing === id && status.playing) {
      player.pause();
      setPreviewing(null);
      return;
    }
    player.replace(ALARM_SOUND_ASSET[id]);
    player.seekTo(0);
    player.play();
    setPreviewing(id);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('plan.alarmSound')}>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
        {ALARM_SOUNDS.map((id, i) => {
          const selected = id === value;
          const isPlaying = playing && previewing === id;
          return (
            <Pressable
              key={id}
              onPress={() => tap(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(ALARM_SOUND_LABEL[id])}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.rowBorder,
                { borderColor: theme.divider, opacity: pressed ? 0.6 : 1 },
              ]}>
              <View style={[styles.play, { backgroundColor: isPlaying ? theme.accentFill : theme.accentSoft }]}>
                {isPlaying ? <StopIcon size={12} color={theme.onAccent} /> : <PlayIcon size={12} color={theme.accent} />}
              </View>
              <Text style={[styles.label, { color: theme.text }]}>{t(ALARM_SOUND_LABEL[id])}</Text>
              {selected && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.note, { color: theme.textTertiary }]}>{t('plan.alarmSilentNote')}</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radii.card, borderWidth: 1, overflow: 'hidden', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1 },
  play: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: Typography.heading, fontWeight: '600' },
  note: { fontSize: Typography.label, textAlign: 'center', marginTop: 12, marginBottom: 20 },
});
