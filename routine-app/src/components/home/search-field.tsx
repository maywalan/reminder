import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import Reanimated, {
  FadeIn,
  interpolateColor,
  Keyframe,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { SearchIcon, XIcon } from '@/components/icon';
import { Text, TextInput } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const SIZE = 34;

/** One spring for every size/position change in Home's search + filter row, so they move as one. */
export const TOOL_ROW_SPRING = { damping: 18, stiffness: 190, mass: 0.8 };
export const toolRowLayout = LinearTransition.springify().damping(TOOL_ROW_SPRING.damping).stiffness(TOOL_ROW_SPRING.stiffness).mass(TOOL_ROW_SPRING.mass);

/** A placeholder word fading in while rising a few points into place, like the reference search bar. */
const wordIn = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 7 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }] },
  })
    .duration(260)
    .delay(140 + i * 70);

/**
 * Home's search bar. Expanded, it fills the row; collapsed (while Colors or Groups is open) it's a
 * round 🔍 button. Between the two it stretches/shrinks on a spring (corners easing from circle to
 * pill), the magnifier turns a quarter-turn, and on expanding the placeholder comes in word by word.
 * Any tap bounces it; while focused the border eases to azure with a soft glow.
 */
export function SearchField({
  value,
  onChangeText,
  inputRef,
  collapsed,
  active,
  onExpand,
}: {
  value: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<RNTextInput | null>;
  collapsed: boolean;
  /** A search is applied while collapsed — tints the round button. */
  active: boolean;
  onExpand: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const scale = useSharedValue(1);
  const turn = useSharedValue(collapsed ? 1 : 0);
  const tint = useSharedValue(collapsed && active ? 1 : 0);

  useEffect(() => {
    turn.value = reduceMotion ? (collapsed ? 1 : 0) : withSpring(collapsed ? 1 : 0, TOOL_ROW_SPRING);
  }, [collapsed, reduceMotion, turn]);
  useEffect(() => {
    tint.value = withTiming(collapsed && active ? 1 : 0, { duration: 200 });
  }, [collapsed, active, tint]);

  const { cardBorder, accent, accentSoft, surface } = theme;
  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(Math.max(focus.value, tint.value), [0, 1], [cardBorder, accent]),
    backgroundColor: interpolateColor(tint.value, [0, 1], [surface, accentSoft]),
    shadowOpacity: focus.value * 0.22,
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 90}deg` }] }));

  // Set while a press on the bar is about to focus the input, so that focus doesn't bounce twice.
  const bouncedByPress = useRef(false);

  function bounce() {
    if (!reduceMotion) scale.value = withSequence(withTiming(0.94, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 300, mass: 0.6 }));
  }

  function onPress() {
    bounce();
    if (collapsed) {
      onExpand();
      return;
    }
    bouncedByPress.current = !focused;
    inputRef.current?.focus();
  }

  function onFocus() {
    setFocused(true);
    focus.value = withTiming(1, { duration: 200 });
    if (!bouncedByPress.current) bounce();
    bouncedByPress.current = false;
  }

  function onBlur() {
    setFocused(false);
    focus.value = withTiming(0, { duration: 200 });
  }

  const iconColor = collapsed ? (active ? theme.accentStrong : theme.text) : focused ? accent : theme.textTertiary;

  return (
    // The outer view owns size and position (the spring layout transition); the inner pressable owns
    // the bounce — Reanimated can't run both on one view's transform.
    <Reanimated.View layout={reduceMotion ? undefined : toolRowLayout} style={collapsed ? styles.collapsed : styles.expanded}>
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={t('search.label')}
        style={[styles.field, collapsed ? styles.fieldCollapsed : styles.fieldExpanded, { shadowColor: accent }, fieldStyle]}>
        <Reanimated.View style={iconStyle}>
          <SearchIcon size={15} color={iconColor} strokeWidth={2.2} />
        </Reanimated.View>
        {!collapsed && (
          <Reanimated.View entering={reduceMotion ? undefined : FadeIn.delay(120).duration(200)} style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              onFocus={onFocus}
              onBlur={onBlur}
              accessibilityLabel={t('search.placeholder')}
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.input, { color: theme.text, fontWeight: '500' }]}
            />
            {value.length === 0 && (
              <View pointerEvents="none" style={styles.placeholder}>
                {t('search.placeholder').split(' ').map((w, i) => (
                  <Reanimated.View key={w} entering={reduceMotion ? undefined : wordIn(i)}>
                    <Text style={[styles.placeholderWord, { color: theme.textTertiary, fontWeight: '500' }]}>{w}</Text>
                  </Reanimated.View>
                ))}
              </View>
            )}
          </Reanimated.View>
        )}
        {!collapsed && value.length > 0 && (
          <Reanimated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
            <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel={t('search.clear')}>
              <XIcon size={13} color={theme.textTertiary} strokeWidth={2.4} />
            </Pressable>
          </Reanimated.View>
        )}
      </AnimatedPressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  expanded: { flex: 1 },
  collapsed: { width: SIZE },
  fieldExpanded: { gap: 8, paddingHorizontal: 12 },
  fieldCollapsed: { justifyContent: 'center' },
  inputWrap: { flex: 1, justifyContent: 'center' },
  input: { fontSize: 13, paddingVertical: 0 },
  placeholder: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeholderWord: { fontSize: 13 },
});
