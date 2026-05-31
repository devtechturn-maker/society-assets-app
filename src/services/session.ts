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
  const [token, user] = await Promise.all([getToken(), getUser()]);
  if (token && user) {
    return user;
  }
  if (token || user) {
    await clearSession();
  }
  return null;
}
