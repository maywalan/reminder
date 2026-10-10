import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { t } from '@/i18n';

/**
 * Full-screen photo preview for a plan's attached photos: swipe between them, pinch to zoom each
 * one, tap ✕ to close. Opens on the photo that was tapped.
 */
export function PhotoViewer({ uris, index, onClose }: { uris: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(index ?? 0);
  const visible = index !== null;

  useEffect(() => {
    if (index === null) return;
    setPage(index);
    // Jump (no animation) to the tapped photo once the pager has laid out.
    requestAnimationFrame(() => pager.current?.scrollTo({ x: index * width, animated: false }));
  }, [index, width]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {uris.map((uri) => (
            // Each page is its own zoomable ScrollView (iOS pinch-to-zoom).
            <ScrollView
              key={uri}
              style={{ width, height }}
              contentContainerStyle={styles.page}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}>
              <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
            </ScrollView>
          ))}
        </ScrollView>

        <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          {uris.length > 1 ? <Text style={styles.counter}>{t('common.of', { n: page + 1, total: uris.length })}</Text> : <View />}
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('photo.close')} style={styles.close}>
            <XIcon size={16} color="#fff" strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  counter: { color: '#fff', fontSize: 14, fontWeight: '600' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
});
