import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
};

async function ensureMediaPermissions(mode: 'camera' | 'library'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const request =
    mode === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
  const result = await request();
  return result.granted;
}

function normalizeAsset(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  const uri = asset.uri;
  const fileName = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return { uri, fileName, mimeType };
}

export async function pickPhotoFromCamera(): Promise<PickedPhoto | null> {
  const granted = await ensureMediaPermissions('camera');
  if (!granted) {
    Alert.alert('Camera permission', 'Allow camera access to take a photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.55,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return normalizeAsset(result.assets[0]);
}

export async function pickPhotoFromLibrary(): Promise<PickedPhoto | null> {
  const granted = await ensureMediaPermissions('library');
  if (!granted) {
    Alert.alert('Photos permission', 'Allow photo library access to choose an image.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.55,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return normalizeAsset(result.assets[0]);
}

export function showPhotoSourcePicker(onCamera: () => void, onLibrary: () => void): void {
  Alert.alert('Add photo', 'Choose a source', [
    { text: 'Camera', onPress: onCamera },
    { text: 'Photo library', onPress: onLibrary },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
