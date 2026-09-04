import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, borderColor: theme.divider }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active && { backgroundColor: theme.accent }]}>
            <Text style={[styles.label, { color: active ? '#fff' : theme.textSecondary }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: Radii.switchTrack, borderWidth: 1, padding: 3, marginHorizontal: 22, marginTop: 14, marginBottom: 4 },
  btn: { flex: 1, paddingVertical: 7, borderRadius: Radii.iconTile, alignItems: 'center' },
  label: { fontSize: Typography.label, fontWeight: '700' },
});
