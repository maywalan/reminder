import { MenuView, type MenuAction } from '@react-native-menu/menu';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Home's Colors / Groups button in the header's top-right: a plain icon circle that opens the
 * native iOS pull-down menu on tap (user, 2026-10-25 — replaced the animated chip panel). A dot in
 * the corner marks an active filter.
 */
export function FilterMenuButton({
  label,
  icon,
  dot,
  actions,
  onAction,
}: {
  label: string;
  icon: (color: string) => ReactNode;
  dot?: string | null;
  actions: MenuAction[];
  onAction: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <MenuView title={label} actions={actions} onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)} shouldOpenOnLongPress={false}>
      <View accessibilityRole="button" accessibilityLabel={label} style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        {icon(theme.text)}
        {!!dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: theme.bg }]} />}
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  btn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
