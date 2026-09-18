import { isMemberRole } from '../services/api';
import type { LoginData } from '../types/api';

/** Phone-login placeholders and other non-inbox emails. */
export function isPlaceholderMemberEmail(email: string | null | undefined): boolean {
  if (email == null || !email.trim()) {
    return true;
  }
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith('@society.local') ||
    normalized.startsWith('vacant.') ||
    !normalized.includes('@')
  );
}

/**
 * Root navigation gate: members without a verified real email must complete profile first.
 * Prefer server flag when present; fall back for older stored sessions.
 */
export function needsMemberProfileCompletion(user: LoginData | null | undefined): boolean {
  if (!user || !isMemberRole(user.role)) {
    return false;
  }
  if (user.profileCompletionRequired === true) {
    return true;
  }
  if (user.profileCompletionRequired === false) {
    return false;
  }
  if (user.emailNeedsCapture === true) {
    return true;
  }
  if (user.emailVerified === false) {
    return true;
  }
  const email = user.email ?? user.memberProfile?.email ?? '';
  return isPlaceholderMemberEmail(email);
}

export function isValidEmailFormat(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());
}
