import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

/** Android treats screens of 600dp or more (smallest side) as large: tablets and foldables. */
const LARGE_SCREEN_DP = 600;

export function isLargeScreen(): boolean {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= LARGE_SCREEN_DP;
}

/**
 * Phones stay in portrait. Tablets and foldables may rotate, as Google Play asks (Android 16 ignores
 * orientation locks on large screens anyway), so the manifest itself no longer locks orientation.
 */
export async function applyOrientationPolicy(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    if (isLargeScreen()) {
      await ScreenOrientation.unlockAsync();
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch {
    // Never block app start on this.
  }
}
