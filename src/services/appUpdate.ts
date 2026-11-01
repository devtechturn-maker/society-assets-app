import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetchAppVersionInfo } from './api';

/**
 * Play Store link when this Android build is older than the backend supports, else null.
 * Any failure (offline, older backend, Expo Go) lets the app open as usual.
 */
export async function checkUpdateRequired(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const current = Number(Constants.expoConfig?.android?.versionCode ?? 0);
  if (!current) return null;
  try {
    const info = await fetchAppVersionInfo();
    return info.minVersionCode > current ? info.storeUrl : null;
  } catch {
    return null;
  }
}
