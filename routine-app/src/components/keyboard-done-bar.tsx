import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * The bar iOS shows above the keyboard with a "Done" that hides it (tester feedback, 2026-11-23:
 * no way to put the keyboard away on New Plan). Render once per screen and pass the same `id` as
 * `inputAccessoryViewID` on each TextInput. iOS only; Android has its own back/hide key.
 */
export function KeyboardDoneBar({ id }: { id: string }) {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View style={[styles.bar, { backgroundColor: dark ? '#2B2B2F' : '#F2F3F6', borderTopColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.hideKeyboard')} style={styles.done}>
          <Text style={[styles.doneText, { color: theme.accentStrong }]}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  done: { minHeight: 44, justifyContent: 'center' },
  doneText: { fontSize: 17, fontWeight: '600' },
});
