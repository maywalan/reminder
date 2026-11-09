import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/text';
import { t } from '@/i18n';
import { BottomSheet } from '@/components/bottom-sheet';
import { CameraIcon, CheckIcon } from '@/components/icon';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Radii, SwatchColors, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { cleanAvatarPhotos, saveAvatarPhoto } from '@/utils/avatar-photo';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePlannerStore((s) => s.profile);
  const setProfile = usePlannerStore((s) => s.setProfile);

  const [name, setName] = useState(profile.name);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [photo, setPhoto] = useState(profile.photo);
  const [photoSheet, setPhotoSheet] = useState(false);
  // What to open once the sheet has gone: iOS won't present the camera/library over a closing modal.
  const pendingPicker = useRef<'camera' | 'library' | null>(null);
  const [error, setError] = useState(false);

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    // Full screen: a second sheet on top of this one didn't take taps (iOS 18, see add-plan).
    presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
  };

  function applyPicked(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets[0]) return;
    try {
      setPhoto(saveAvatarPhoto(result.assets[0].uri));
    } catch {
      // Copy failed (out of space): keep the current picture.
    }
  }

  function openAfterSheet(kind: 'camera' | 'library') {
    pendingPicker.current = kind;
    setPhotoSheet(false);
  }

  function onSheetClosed() {
    const kind = pendingPicker.current;
    pendingPicker.current = null;
    if (kind === 'camera') takePhoto();
    if (kind === 'library') chooseFromLibrary();
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile.cameraOffTitle'), t('profile.cameraOffBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      applyPicked(await ImagePicker.launchCameraAsync({ ...pickerOptions, cameraType: ImagePicker.CameraType.front }));
    } catch {
      // No camera (simulator, some iPads) or it's in use elsewhere.
      Alert.alert(t('profile.cameraUnavailable'));
    }
  }

  async function chooseFromLibrary() {
    // No permission prompt: the system photo picker runs out of process (see add-plan).
    try {
      applyPicked(await ImagePicker.launchImageLibraryAsync(pickerOptions));
    } catch {
      // Picker failed to open: nothing changes.
    }
  }

  function handleSave() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    setProfile({ name: name.trim(), avatarColor, photo });
    cleanAvatarPhotos(photo);
    router.back();
  }

  const saveDisabled = !name.trim();

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.rowLabel, fontWeight: '600' }}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: Typography.sheetTitle, fontWeight: '800' }}>{t('profile.edit')}</Text>
        <Pressable onPress={handleSave} hitSlop={8} disabled={saveDisabled}>
          <Text style={{ color: saveDisabled ? theme.textFaint : theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('common.save')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.previewWrap}>
          <Pressable
            onPress={() => setPhotoSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.photoChange')}
            style={({ pressed }) => [styles.preview, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
            <ProfileAvatar name={name} avatarColor={avatarColor} photo={photo} size={92} />
            <View style={[styles.cameraBadge, { backgroundColor: theme.surface, borderColor: theme.bg }]}>
              <CameraIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable onPress={() => setPhotoSheet(true)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowValue, fontWeight: '700', marginTop: 10 }}>{t('profile.photoChange')}</Text>
          </Pressable>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>{t('profile.yourName')}</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(false);
              }}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: error ? theme.danger : 'transparent' }]}
            />
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={[styles.label, { color: theme.textTertiary, paddingHorizontal: 14, paddingTop: 12 }]}>{t('profile.color')}</Text>
          <View style={styles.swatchRow}>
            {SwatchColors.map((c) => {
              // With a photo no colour is in use, so none shows as picked.
              const selected = !photo && c === avatarColor;
              return (
                <Pressable
                  key={c}
                  // Picking a colour means "use initials": it drops the photo (only on Save; Cancel keeps it).
                  onPress={() => {
                    setAvatarColor(c);
                    setPhoto(undefined);
                  }}
                  style={[styles.swatchRing, { borderColor: selected ? theme.text : 'transparent' }]}>
                  <View style={[styles.swatchGap, { backgroundColor: theme.surface }]}>
                    <View style={[styles.swatch, { backgroundColor: c }]}>{selected && <CheckIcon size={14} color="#fff" strokeWidth={3} />}</View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} onClosed={onSheetClosed} title={t('profile.photo')}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10, marginBottom: 20 }]}>
          <Pressable onPress={() => openAfterSheet('camera')} style={styles.sheetRow}>
            <Text style={[styles.sheetLabel, { color: theme.text }]}>{t('profile.photoTake')}</Text>
          </Pressable>
          <Pressable onPress={() => openAfterSheet('library')} style={[styles.sheetRow, styles.sheetBorder, { borderColor: theme.divider }]}>
            <Text style={[styles.sheetLabel, { color: theme.text }]}>{t('profile.photoLibrary')}</Text>
          </Pressable>
          {photo && (
            <Pressable
              onPress={() => {
                setPhoto(undefined);
                setPhotoSheet(false);
              }}
              style={[styles.sheetRow, styles.sheetBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.sheetLabel, { color: theme.danger }]}>{t('profile.photoRemove')}</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 8 },
  previewWrap: { alignItems: 'center', paddingVertical: 16 },
  preview: { width: 92, height: 92 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sheetRow: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 16 },
  sheetBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  sheetLabel: { fontSize: Typography.rowLabel, fontWeight: '600' },
  group: { borderRadius: Radii.card, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: Typography.caption, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  input: { fontSize: Typography.rowLabel, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14 },
  swatchRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchGap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
