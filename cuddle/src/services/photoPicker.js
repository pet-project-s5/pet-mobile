import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// On web, expo-image-picker works for gallery but camera is unreliable.
// We fall back to a plain HTML file input for both cases on web.

function pickFileWeb() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) { resolve(null); return; }
      const uri = URL.createObjectURL(file);
      resolve(uri);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function pickFromGallery() {
  if (Platform.OS === 'web') {
    return pickFileWeb();
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
}

export async function takePhoto() {
  if (Platform.OS === 'web') {
    // Browsers don't give camera access via file input reliably;
    // fall back to gallery pick on web.
    return pickFileWeb();
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;
  return result.assets?.[0]?.uri ?? null;
}
