import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface Props<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.dividerStrong }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active && { backgroundColor: theme.surface }]}>
            <Text style={[styles.label, { color: active ? theme.text : theme.textSecondary }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 11, padding: 3, marginHorizontal: 22, marginTop: 14, marginBottom: 4 },
  btn: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
});
