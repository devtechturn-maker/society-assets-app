import * as SecureStore from 'expo-secure-store';
import type { LoginData } from '../types/api';
import { mergeLoginUserPatch } from '../utils/userDisplayName';

const TOKEN_KEY = 'gl_token';
const USER_KEY = 'gl_user';

/** Expo Go + AsyncStorage often breaks with "legacy storage" — use SecureStore (same idea as web localStorage for session). */
export async function saveSession(data: LoginData): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* key may be absent */
  }
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    /* key may be absent */
  }
  const { clearAppViewContext } = await import('./appContext');
  await clearAppViewContext();
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getUser(): Promise<LoginData | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LoginData;
  } catch {
    return null;
  }
}

export async function updateStoredUser(patch: Partial<LoginData>): Promise<LoginData | null> {
  const current = await getUser();
  if (!current) {
    return null;
  }
  const next = mergeLoginUserPatch(current, patch);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
  return next;
}
