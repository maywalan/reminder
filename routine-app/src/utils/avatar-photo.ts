import { Directory, File, Paths } from 'expo-file-system';

/**
 * Profile photos live in the app's Documents/avatar folder (the picker's own copy sits in Caches,
 * which iOS may clear). The profile stores only the file *name*: the app container's absolute path
 * changes when the app is updated, so a saved full path would break.
 */
function avatarDir(): Directory {
  const dir = new Directory(Paths.document, 'avatar');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Copies a picked/taken image into the avatar folder and returns its file name. */
export function saveAvatarPhoto(pickedUri: string): string {
  const name = `avatar-${Date.now()}.jpg`;
  new File(pickedUri).copy(new File(avatarDir(), name));
  return name;
}

/** A displayable URI for a saved photo name, or null if the file is gone. */
export function avatarPhotoUri(name: string | undefined): string | null {
  if (!name) return null;
  try {
    const file = new File(avatarDir(), name);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Deletes every saved photo except `keep` (old ones replaced, picked-then-cancelled, or signed out). */
export function cleanAvatarPhotos(keep?: string) {
  try {
    for (const item of avatarDir().list()) {
      if (item instanceof File && item.name !== keep) item.delete();
    }
  } catch {
    // Best effort: a leftover file only costs a little space.
  }
}
