import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Reanimated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { Fonts, Radii, Typography } from '@/constants/theme';
import { t as tr } from '@/i18n';

/** How long Undo stays on screen after a delete. */
const UNDO_MS = 6000;

/**
 * Home's undo after a delete (critique, 2026-10-28): the app's ink toast pill with an Undo button,
 * gone after 6 seconds instead of a card that sat on the page all session.
 */
export function UndoToast({ visible, onUndo, onExpire }: { visible: boolean; onUndo: () => void; onExpire: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onExpire, UNDO_MS);
    return () => clearTimeout(timer);
  }, [visible, onExpire]);

  if (!visible) return null;
  return (
    <Reanimated.View
      entering={reduceMotion ? undefined : FadeInDown.springify().damping(16).stiffness(220)}
      exiting={reduceMotion ? undefined : FadeOut.duration(160)}
      style={styles.toast}>
      <Text style={styles.text}>{tr('home.deleted')}</Text>
      <Pressable onPress={onUndo} hitSlop={12} accessibilityRole="button">
        {({ pressed }) => <Text style={[styles.undo, pressed && styles.pressed]}>{tr('home.undo')}</Text>}
      </Pressable>
    </Reanimated.View>
  );
}

// Same pill as components/toast.tsx, with room for the button.
const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 64,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#10203A',
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 18,
    borderRadius: Radii.chip + 2,
  },
  text: { color: '#fff', fontSize: Typography.rowValue, fontWeight: '600', fontFamily: Fonts[600] },
  undo: { color: '#7DB4FF', fontSize: Typography.rowValue, fontWeight: '700', fontFamily: Fonts[700] },
  pressed: { opacity: 0.6 },
});
