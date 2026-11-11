import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { hueAccent } from '@/constants/theme';

interface Props {
  hue: number;
  scheme: 'light' | 'dark';
  /** Every move while dragging (cheap: local preview only). */
  onChange: (hue: number) => void;
  /** Once on release/tap, to save. */
  onCommit: (hue: number) => void;
  accessibilityLabel: string;
}

const THUMB = 30;
const BAR = 18;

/**
 * Rainbow bar for the Theme colour picker (2026-11-11). The gradient is drawn from the same
 * contrast-adjusted shades the app will use (hueAccent), so what you drag over is what you get.
 */
export function HueSlider({ hue, scheme, onChange, onCommit, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const last = useRef(hue);
  /** Track's left edge in page coordinates, measured at touch-down (locationX is unreliable once the finger leaves the bar). */
  const originX = useRef(0);
  const grab = useRef(new Animated.Value(1)).current;

  const stops = useMemo(() => {
    const colors: string[] = [];
    for (let h = 0; h <= 360; h += 20) colors.push(hueAccent(h % 360)[scheme].accent);
    return colors as unknown as readonly [string, string, ...string[]];
  }, [scheme]);

  const hueAt = (x: number) => {
    const w = widthRef.current - THUMB;
    if (w <= 0) return last.current;
    return Math.round((Math.min(Math.max(x - THUMB / 2, 0), w) / w) * 359);
  };

  const spring = (to: number) => Animated.spring(grab, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 12 }).start();

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the drag even if the finger wanders vertically (the sheet must not steal it).
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          spring(1.25);
          originX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
          last.current = hueAt(e.nativeEvent.locationX);
          onChange(last.current);
        },
        onPanResponderMove: (_e, g) => {
          last.current = hueAt(g.moveX - originX.current);
          onChange(last.current);
        },
        onPanResponderRelease: () => {
          spring(1);
          Haptics.selectionAsync().catch(() => {});
          onCommit(last.current);
        },
        onPanResponderTerminate: () => {
          spring(1);
          onCommit(last.current);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, onCommit]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  const left = width > THUMB ? (hue / 359) * (width - THUMB) : 0;
  const color = hueAccent(hue)[scheme].accent;
  const step = (d: number) => {
    const next = (hue + d + 360) % 360;
    onChange(next);
    onCommit(next);
  };

  return (
    <View
      onLayout={onLayout}
      style={styles.track}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 359, now: hue }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 15 : -15)}
      {...responder.panHandlers}>
      <LinearGradient colors={stops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.bar} pointerEvents="none" />
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { left, backgroundColor: color, transform: [{ scale: grab }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 44, justifyContent: 'center' },
  bar: { height: BAR, borderRadius: BAR / 2, marginHorizontal: THUMB / 2 - BAR / 2 },
  thumb: {
    position: 'absolute',
    top: (44 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
