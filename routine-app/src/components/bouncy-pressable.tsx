import type { ComponentProps } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const PRESS_SPRING = { damping: 15, stiffness: 420, mass: 0.6 };
const RELEASE_SPRING = { damping: 9, stiffness: 300, mass: 0.6 };

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  /** Reanimated entering animation, e.g. a staggered slide-in when a row of chips appears. */
  entering?: ComponentProps<typeof Reanimated.View>['entering'];
};

/**
 * A Pressable that squishes down while held and springs back with a little overshoot on release —
 * the tap feedback for Home's search / Colors / Groups buttons and their chips. Skipped under
 * Reduce Motion.
 */
export function BouncyPressable({ style, onPressIn, onPressOut, pressedScale = 0.88, entering, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressable = (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withSpring(pressedScale, PRESS_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) scale.value = withSpring(1, RELEASE_SPRING);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
  // The entering animation runs on a wrapper — Reanimated can't animate the same view's transform
  // for both it and the press bounce.
  return entering ? <Reanimated.View entering={entering}>{pressable}</Reanimated.View> : pressable;
}
