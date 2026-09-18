import { clearSession, getToken, getUser } from './storage';
import type { LoginData } from '../types/api';

let onSessionInvalid: (() => void) | null = null;

export function setSessionInvalidHandler(handler: (() => void) | null): void {
  onSessionInvalid = handler;
}

export function notifySessionInvalid(): void {
  onSessionInvalid?.();
}

/** Restore login from secure storage (token + user must both exist). */
export async function loadStoredSession(): Promise<LoginData | null> {
  // Dev helper: set EXPO_PUBLIC_FORCE_LOGOUT=1 in .env to wipe SecureStore and show login.
  if (process.env.EXPO_PUBLIC_FORCE_LOGOUT === '1') {
    await clearSession();
    if (__DEV__) {
      console.log('[SocietyAssets] FORCE_LOGOUT cleared local session');
    }
    return null;
  }
  const [token, user] = await Promise.all([getToken(), getUser()]);
  if (token && user) {
    return user;
  }
  if (token || user) {
    await clearSession();
  }
  return null;
}
