import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

/** Shared bottom-sheet chrome (handle + Cancel/Title/Done head row), matching the prototype's `.sheet` overlays. */
export function BottomSheet({ visible, onClose, title, left, right, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
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
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, maxHeight: '86%' },
  handle: { width: 38, height: 4.5, borderRadius: 3, backgroundColor: 'rgba(120,120,128,0.3)', alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  headSide: { minWidth: 44 },
  headSideRight: { alignItems: 'flex-end' },
  title: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
});
