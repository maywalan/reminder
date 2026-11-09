import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import type { Profile } from '@/store/types';
import { avatarPhotoUri } from '@/utils/avatar-photo';
import { profileInitials } from '@/utils/profile';

/** The profile photo if one is set, else initials on the profile colour. */
export function ProfileAvatar({ name, avatarColor, photo, size }: Pick<Profile, 'name' | 'avatarColor' | 'photo'> & { size: number }) {
  const uri = avatarPhotoUri(photo);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={round} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.initialsWrap, round, { backgroundColor: avatarColor }]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{profileInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsWrap: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '800' },
});
