import * as SecureStore from 'expo-secure-store';
import type { LoginData } from '../types/api';
import { isMemberRole } from './api';

export type AppViewContext = 'CHAIRMAN' | 'MEMBER';

const APP_CONTEXT_KEY = 'gl_app_context';

export async function getAppViewContext(): Promise<AppViewContext | null> {
  try {
    const raw = await SecureStore.getItemAsync(APP_CONTEXT_KEY);
    if (raw === 'CHAIRMAN' || raw === 'MEMBER') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function setAppViewContext(context: AppViewContext): Promise<void> {
  await SecureStore.setItemAsync(APP_CONTEXT_KEY, context);
}

export async function clearAppViewContext(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(APP_CONTEXT_KEY);
  } catch {
    /* key may be absent */
  }
}

export async function resolveInitialAppViewContext(user: LoginData): Promise<AppViewContext> {
  const stored = await getAppViewContext();
  if (stored) {
    return stored;
  }
  if (isMemberRole(user.role)) {
    return 'MEMBER';
  }
  return 'CHAIRMAN';
}

export async function initializeAppViewContext(user: LoginData): Promise<AppViewContext> {
  const context = await resolveInitialAppViewContext(user);
  await setAppViewContext(context);
  return context;
}

export function canSwitchAppView(user: LoginData): boolean {
  return user.canSwitchToMemberView === true && !!user.memberProfile;
}

export function isMemberPortalView(user: LoginData, context: AppViewContext): boolean {
  if (isMemberRole(user.role)) {
    return true;
  }
  return canSwitchAppView(user) && context === 'MEMBER';
}
