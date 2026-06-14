import type { LoginData } from '../types/api';

export function userDisplayName(
  user: Pick<LoginData, 'firstName' | 'lastName' | 'memberProfile'>
): string {
  const first = (user.firstName ?? '').trim();
  const last = (user.lastName ?? '').trim();
  const composed = `${first} ${last}`.trim();
  if (composed) {
    return composed;
  }
  const legacy = user.memberProfile?.name?.trim();
  return legacy ?? '';
}

export function mergeLoginUserPatch(
  current: LoginData,
  patch: Partial<LoginData>
): LoginData {
  const next: LoginData = { ...current, ...patch };
  if (patch.memberProfile && current.memberProfile) {
    next.memberProfile = { ...current.memberProfile, ...patch.memberProfile };
  }
  return next;
}
