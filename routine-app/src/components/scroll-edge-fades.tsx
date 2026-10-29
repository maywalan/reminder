import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Edges for a tab screen's scroll view, drawn over it in the page colour (`color`, a #RRGGBB hex):
 * a band under the status bar so scrolled content doesn't collide with the clock, and a fade above
 * the tab bar so content dissolves instead of being cut off (critique, 2026-10-28; on every tab
 * since 2026-10-29). Render it after the scroll view, inside the screen's root view.
 */
export function ScrollEdgeFades({ color }: { color: string }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[`${color}00`, color]} style={styles.bottomFade} />
      <View pointerEvents="none" style={[styles.statusBand, { height: insets.top }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
        <LinearGradient colors={[color, `${color}00`]} style={styles.statusFade} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  statusBand: { position: 'absolute', top: 0, left: 0, right: 0 },
  statusFade: { position: 'absolute', top: '100%', left: 0, right: 0, height: 14 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
});
