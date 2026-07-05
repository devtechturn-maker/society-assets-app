import * as SecureStore from 'expo-secure-store';
import type { LoginData } from '../types/api';
import { isMemberRole } from './api';

export type AppViewContext = 'CHAIRMAN' | 'MEMBER';

export type LoginRoleOption = {
  context: AppViewContext;
  title: string;
  subtitle: string;
};

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

function formatStaffRole(role: string | undefined): string {
  switch ((role ?? '').trim().toUpperCase()) {
    case 'CHAIRMAN':
      return 'Chairman';
    case 'TREASURER':
      return 'Treasurer';
    case 'AUDITOR':
      return 'Auditor';
    case 'USER':
      return 'Staff';
    default:
      return role?.trim() || 'Office';
  }
}

export function canSwitchAppView(user: LoginData): boolean {
  return user.canSwitchToMemberView === true && !!user.memberProfile;
}

export function getAvailableLoginRoles(user: LoginData): LoginRoleOption[] {
  const roles: LoginRoleOption[] = [];

  if (!isMemberRole(user.role)) {
    roles.push({
      context: 'CHAIRMAN',
      title: 'Office',
      subtitle: `${formatStaffRole(user.role)} · manage society modules`,
    });
  }

  if (isMemberRole(user.role) || canSwitchAppView(user)) {
    const flatLabel = user.memberProfile?.flatNumber
      ? `Flat ${user.memberProfile.flatNumber}`
      : 'Your flat';
    roles.push({
      context: 'MEMBER',
      title: 'Member',
      subtitle: `${flatLabel} · maintenance, notices, and chat`,
    });
  }

  return roles;
}

/** True when user can switch between Office and Member from the menu. */
export function canSwitchLoginRole(user: LoginData): boolean {
  return getAvailableLoginRoles(user).length > 1;
}

/** Show role picker after login (including single-society staff with Office only). */
export function requiresRoleSelection(user: LoginData): boolean {
  const roles = getAvailableLoginRoles(user);
  if (roles.length > 1) {
    return true;
  }
  return roles.length === 1 && roles[0].context === 'CHAIRMAN';
}

export async function resolveInitialAppViewContext(user: LoginData): Promise<AppViewContext> {
  if (isMemberRole(user.role)) {
    return 'MEMBER';
  }
  if (!canSwitchAppView(user)) {
    return 'CHAIRMAN';
  }
  const stored = await getAppViewContext();
  if (stored === 'MEMBER' || stored === 'CHAIRMAN') {
    return stored;
  }
  return 'CHAIRMAN';
}

export async function initializeAppViewContext(user: LoginData): Promise<AppViewContext> {
  if (requiresRoleSelection(user)) {
    return 'CHAIRMAN';
  }
  const context = await resolveInitialAppViewContext(user);
  if (context === 'MEMBER' && !canSwitchAppView(user) && !isMemberRole(user.role)) {
    await setAppViewContext('CHAIRMAN');
    return 'CHAIRMAN';
  }
  await setAppViewContext(context);
  return context;
}

export function isMemberPortalView(user: LoginData, context: AppViewContext): boolean {
  if (isMemberRole(user.role)) {
    return true;
  }
  return canSwitchAppView(user) && context === 'MEMBER';
}
