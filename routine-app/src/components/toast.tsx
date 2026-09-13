import { StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icon';
import { Fonts, Radii, Typography } from '@/constants/theme';

interface ToastProps {
  message: string | null;
}

/** Small floating confirmation pill — ink bg, white text, a green tick, matching the design's toast spec. */
export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <CheckIcon size={14} color="#4FC98A" strokeWidth={3} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    maxWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10203A',
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: Radii.chip + 2,
    overflow: 'hidden',
  },
  text: { color: '#fff', fontSize: Typography.rowValue, fontWeight: '600', fontFamily: Fonts[600] },
});
