import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icon';
import { Radii, SwatchColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { profileInitials } from '@/utils/profile';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePlannerStore((s) => s.profile);
  const setProfile = usePlannerStore((s) => s.setProfile);

  const [name, setName] = useState(profile.name);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [error, setError] = useState(false);

  function handleSave() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    setProfile({ name: name.trim(), avatarColor });
    router.back();
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>Edit Profile</Text>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.previewWrap}>
          <View style={[styles.preview, { backgroundColor: avatarColor }]}>
            <Text style={styles.previewInitials}>{profileInitials(name)}</Text>
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>YOUR NAME</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(false);
              }}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: error ? theme.danger : 'transparent' }]}
            />
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Text style={[styles.label, { color: theme.textTertiary, paddingHorizontal: 14, paddingTop: 12 }]}>COLOR</Text>
          <View style={styles.swatchRow}>
            {SwatchColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setAvatarColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === avatarColor ? theme.text : 'transparent' }]}>
                {c === avatarColor && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 8 },
  previewWrap: { alignItems: 'center', paddingVertical: 16 },
  preview: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  previewInitials: { color: '#fff', fontSize: 32, fontWeight: '800' },
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  input: { fontSize: 15.5, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
