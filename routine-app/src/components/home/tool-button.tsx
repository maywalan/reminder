import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Reanimated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { TOOL_ROW_SPRING, toolRowLayout } from '@/components/home/search-field';
import { Text } from '@/components/text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

/**
 * Home's Colors / Groups button: an icon circle that grows into a labelled pill while its panel is
 * open. Opening and closing ride the tool row's shared spring (width, and the neighbours sliding
 * along), the fill and border cross-fade rather than snap, the label fades in once there's room,
 * and the icon gives a little twist. A dot in the corner marks an active filter while closed.
 */
export function ToolButton({
  open,
  label,
  icon,
  dot,
  onPress,
}: {
  open: boolean;
  label: string;
  icon: (color: string) => ReactNode;
  dot?: string | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const scale = useSharedValue(1);
  const twist = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 220 });
    if (!reduceMotion && open) twist.value = withSequence(withTiming(-14, { duration: 110 }), withSpring(0, { damping: 8, stiffness: 260 }));
  }, [open, progress, twist, reduceMotion]);

  const { cardBorder, surface, accentSoft } = theme;
  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [surface, accentSoft]),
    borderColor: interpolateColor(progress.value, [0, 1], [cardBorder, accentSoft]),
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${twist.value}deg` }] }));

  const color = open ? theme.accentStrong : theme.text;

  return (
    // Outer view: the spring layout transition. Inner pressable: the press bounce (see SearchField).
    <Reanimated.View layout={reduceMotion ? undefined : toolRowLayout}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) scale.value = withSpring(0.88, { damping: 15, stiffness: 420, mass: 0.6 });
        }}
        onPressOut={() => {
          if (!reduceMotion) scale.value = withSpring(1, { damping: 9, stiffness: 300, mass: 0.6 });
        }}
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={[styles.btn, open && styles.btnOpen, boxStyle]}>
        <Reanimated.View style={iconStyle}>{icon(color)}</Reanimated.View>
        {open && (
          <Reanimated.View entering={FadeIn.delay(90).duration(180)} exiting={FadeOut.duration(90)}>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Reanimated.View>
        )}
        {!!dot && !open && (
          <Reanimated.View
            entering={ZoomIn.springify().damping(TOOL_ROW_SPRING.damping)}
            exiting={ZoomOut.duration(120)}
            style={[styles.dot, { backgroundColor: dot, borderColor: theme.bg }]}
          />
        )}
      </AnimatedPressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  btn: { minWidth: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnOpen: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  label: { fontSize: 12, fontWeight: '700', fontFamily: Fonts[700] },
  dot: { position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
