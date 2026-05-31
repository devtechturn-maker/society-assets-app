import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '../theme/themes';

const THEME_KEY = 'gl_theme_mode';
const ALLOW_SCREEN_CAPTURE_KEY = 'gl_allow_screen_capture';

export async function getAllowScreenCapture(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(ALLOW_SCREEN_CAPTURE_KEY);
    if (v === null) return false;
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export async function setAllowScreenCapture(allow: boolean): Promise<void> {
  await SecureStore.setItemAsync(ALLOW_SCREEN_CAPTURE_KEY, allow ? '1' : '0');
}

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const v = await SecureStore.getItemAsync(THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, mode);
}
