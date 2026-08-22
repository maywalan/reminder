import { StyleSheet, Text } from 'react-native';

import { Typography } from '@/constants/theme';

interface ToastProps {
  message: string | null;
}

/** Small floating confirmation pill, matching the prototype's `showSnackbarSimple`. */
export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <Text style={styles.toast} pointerEvents="none">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    maxWidth: '82%',
    textAlign: 'center',
    backgroundColor: 'rgba(28,28,30,0.92)',
    color: '#fff',
    fontSize: Typography.body,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
