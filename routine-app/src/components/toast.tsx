import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { CheckIcon, WarningIcon } from '@/components/icon';
import { Colors, Fonts, Radii, Typography } from '@/constants/theme';

/** success = green tick; error = warning sign (failed purchase, missing field); info = text only (not available yet, nothing found). */
export type ToastKind = 'success' | 'error' | 'info';

interface ToastProps {
  message: string | null;
  kind?: ToastKind;
}

/** Small floating pill — ink bg, white text, matching the design's toast spec. */
export function Toast({ message, kind = 'success' }: ToastProps) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      {kind === 'success' && <CheckIcon size={14} color="#4FC98A" strokeWidth={3} />}
      {kind === 'error' && <WarningIcon size={15} color={Colors.dark.danger} strokeWidth={2.2} />}
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
