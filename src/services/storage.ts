import * as SecureStore from 'expo-secure-store';
import type { LoginData } from '../types/api';
import { mergeLoginUserPatch } from '../utils/userDisplayName';

const TOKEN_KEY = 'gl_token';
const USER_KEY = 'gl_user';
const REFRESH_KEY = 'gl_refresh';

/** The user record without the renewal token, which lives only under its own key. */
function withoutSecret(data: LoginData): LoginData {
  const { refreshToken: _omit, ...rest } = data;
  return rest as LoginData;
}

/** Expo Go + AsyncStorage often breaks with "legacy storage" — use SecureStore (same idea as web localStorage for session). */
export async function saveSession(data: LoginData): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(withoutSecret(data)));
  // A session refresh without a new renewal token keeps the one already stored.
  if (typeof data.refreshToken === 'string' && data.refreshToken.length > 0) {
    await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
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
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
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
  const next = withoutSecret(mergeLoginUserPatch(current, patch));
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
  if (typeof patch.token === 'string' && patch.token.length > 0) {
    await SecureStore.setItemAsync(TOKEN_KEY, patch.token);
  }
  if (typeof patch.refreshToken === 'string' && patch.refreshToken.length > 0) {
    await SecureStore.setItemAsync(REFRESH_KEY, patch.refreshToken);
  }
  return next;
}
