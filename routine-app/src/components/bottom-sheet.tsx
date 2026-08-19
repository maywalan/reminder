import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

/**
 * Shared bottom-sheet chrome (handle + Cancel/Title/Done head row), matching the prototype's
 * `.sheet` overlays. Animates the backdrop fade and sheet slide independently (rather than
 * relying on RN Modal's built-in "slide" animation, which moves the opaque backdrop + sheet as
 * one rigid block) so it reads like a native iOS sheet presentation.
 */
export function BottomSheet({ visible, onClose, title, left, right, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        damping: 24,
        mass: 0.9,
        stiffness: 220,
      }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0], extrapolate: 'clamp' });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]} />
        </Pressable>
        <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }]}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <View style={styles.headSide}>{left}</View>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.headSide, styles.headSideRight]}>{right}</View>
            </View>
            {children}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.42)' },
  // maxHeight must live here, not on `sheet` below: percentage heights only resolve against a
  // parent with a definite size, and this View's parent (`root`) has a real flex:1 height —
  // `sheet`'s old parent (this same Animated.View) had none, so '86%' silently failed to
  // constrain it, letting the backdrop show through as a grey gap under a too-short sheet.
  sheetWrap: { maxHeight: '86%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  sheet: { paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 38, height: 4.5, borderRadius: 3, backgroundColor: 'rgba(120,120,128,0.3)', alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  headSide: { minWidth: 44 },
  headSideRight: { alignItems: 'flex-end' },
  title: { fontSize: Typography.title, fontWeight: '800', flex: 1, textAlign: 'center' },
});
