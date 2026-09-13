import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export type TickleMood = 'idle' | 'live' | 'due' | 'off';

/** Bubble color per mood — azure idle, green while a session runs, amber when something's due, grey when there's nothing to do. */
const BUBBLE_COLOR: Record<TickleMood, string> = {
  idle: '#1B76E8',
  live: '#4FC98A',
  due: '#F0A32E',
  off: '#B7C0D1',
};

interface TickleProps {
  /** Body size in pt. Below 34 only the bubble renders; the mouth itself drops below 40 (see design_handoff_tickle_draft2/README.md). */
  size: number;
  mood?: TickleMood;
  /** Idle "breathe" loop — a slow, subtle scale pulse. Off by default for small/inline uses. */
  animated?: boolean;
}

/**
 * The Tickle mascot: gradient body, two ink eyes, a half-round mouth, and a mood-colored bubble
 * above the head. Geometry follows the design handoff's prose spec (radius 46/46/42/42, eyes at
 * ~11% of body width) rather than lifted SVG paths — the handoff's canvas export doesn't expose
 * its path data to a text read.
 */
export function Tickle({ size, mood = 'idle', animated = false }: TickleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.035, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.985, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, scale]);

  const bubbleColor = BUBBLE_COLOR[mood];
  const bubbleSize = Math.max(9, size * 0.32);

  if (size < 34) {
    return <View style={{ width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2, backgroundColor: bubbleColor }} />;
  }

  const eyeSize = Math.max(2, size * 0.11);
  const showMouth = size >= 40;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2, backgroundColor: bubbleColor, marginBottom: size * 0.07 }} />
      <Animated.View style={{ transform: [{ scale: animated ? scale : 1 }] }}>
        <LinearGradient
          colors={['#E3F0FE', '#B9D8FA']}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={{
            width: size,
            height: size,
            borderTopLeftRadius: size * 0.46,
            borderTopRightRadius: size * 0.46,
            borderBottomRightRadius: size * 0.42,
            borderBottomLeftRadius: size * 0.42,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ flexDirection: 'row', gap: size * 0.16, marginBottom: showMouth ? size * 0.07 : 0 }}>
            <View style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#10203A' }} />
            <View style={{ width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#10203A' }} />
          </View>
          {showMouth && (
            <View
              style={{
                width: size * 0.22,
                height: size * 0.11,
                borderBottomLeftRadius: size * 0.11,
                borderBottomRightRadius: size * 0.11,
                backgroundColor: 'rgba(16,32,58,0.5)',
              }}
            />
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
