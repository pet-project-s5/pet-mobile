import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// On native we persist the file; on web we store base64 in AsyncStorage.

const USER_PHOTO_KEY = (userId) => `user_photo_${userId}`;
const PET_PHOTO_KEY  = (petId)  => `pet_photo_${petId}`;

// ─── Web helpers ──────────────────────────────────────────────────────────────

async function uriToBase64Web(uri) {
  // uri may be a blob URL (from image picker) or a data URL already
  if (uri.startsWith('data:')) return uri;
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Native helpers ───────────────────────────────────────────────────────────

async function saveNative(uri, key) {
  // Lazy import so web bundle never loads expo-file-system
  const FS = await import('expo-file-system/legacy');
  const ext  = (uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const dest = FS.documentDirectory + key.replace(/[^a-z0-9_]/gi, '_') + '.' + ext;
  await FS.copyAsync({ from: uri, to: dest });
  await AsyncStorage.setItem(key, dest);
  return dest;
}

async function getNative(key) {
  const uri = await AsyncStorage.getItem(key);
  if (!uri) return null;
  const FS = await import('expo-file-system/legacy');
  const info = await FS.getInfoAsync(uri);
  return info.exists ? uri : null;
}

async function deleteNative(key) {
  const uri = await AsyncStorage.getItem(key);
  if (uri) {
    try {
      const FS = await import('expo-file-system/legacy');
      await FS.deleteAsync(uri, { idempotent: true });
    } catch (_) {}
  }
  await AsyncStorage.removeItem(key);
}

// ─── Unified API ─────────────────────────────────────────────────────────────

export async function savePhoto(uri, key) {
  if (Platform.OS === 'web') {
    const base64 = await uriToBase64Web(uri);
    await AsyncStorage.setItem(key, base64);
    return base64;
  }
  return saveNative(uri, key);
}

export async function getPhoto(key) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key); // base64 or null
  }
  return getNative(key);
}

export async function deletePhoto(key) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  return deleteNative(key);
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export const saveUserPhoto   = (userId, uri) => savePhoto(uri, USER_PHOTO_KEY(userId));
export const getUserPhoto    = (userId)       => getPhoto(USER_PHOTO_KEY(userId));
export const deleteUserPhoto = (userId)       => deletePhoto(USER_PHOTO_KEY(userId));

export const savePetPhoto    = (petId, uri)   => savePhoto(uri, PET_PHOTO_KEY(petId));
export const getPetPhoto     = (petId)        => getPhoto(PET_PHOTO_KEY(petId));
export const deletePetPhoto  = (petId)        => deletePhoto(PET_PHOTO_KEY(petId));
