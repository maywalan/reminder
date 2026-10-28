import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { useHomeTokens, useHomeType } from '@/components/home/tokens';
import { XIcon } from '@/components/icon';
import { Text } from '@/components/text';
import { t as tr } from '@/i18n';

export interface FilterChip {
  key: string;
  label: string;
  color: string;
  onRemove: () => void;
}

/**
 * The active Colors / Groups filters as removable chips under Home's header (critique, 2026-10-28):
 * the corner dot alone didn't say why plans were missing. Tapping a chip turns that filter off.
 */
export function FilterChips({ chips }: { chips: FilterChip[] }) {
  const k = useHomeTokens();
  const t = useHomeType();
  const reduceMotion = useReducedMotion();
  if (chips.length === 0) return null;
  return (
    <View style={styles.row}>
      {chips.map((c) => (
        <Reanimated.View
          key={c.key}
          entering={reduceMotion ? undefined : FadeIn.duration(180)}
          exiting={reduceMotion ? undefined : FadeOut.duration(140)}
          layout={reduceMotion ? undefined : LinearTransition.springify().damping(18).stiffness(220)}>
          <BouncyPressable
            pressedScale={0.94}
            onPress={() => {
              Haptics.selectionAsync();
              c.onRemove();
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={tr('home.removeFilter', { name: c.label })}
            style={[styles.chip, { backgroundColor: k.azureTint }]}>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text numberOfLines={1} style={[t.chip, styles.label, { color: k.azureDark }]}>
              {c.label}
            </Text>
            <XIcon size={11} color={k.azureDark} strokeWidth={2.6} />
          </BouncyPressable>
        </Reanimated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 10, paddingRight: 11, borderRadius: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { maxWidth: 140 },
});
