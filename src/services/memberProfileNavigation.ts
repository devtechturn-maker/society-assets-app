type ProfileNavigateListener = () => void;

const listeners = new Set<ProfileNavigateListener>();

export function subscribeMemberProfileNavigation(listener: ProfileNavigateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestMemberProfileNavigation(): void {
  listeners.forEach((listener) => listener());
}

export const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const response = (error as { response?: { data?: { code?: string; error?: string; message?: string } } }).response;
  const data = response?.data;
  if (!data) {
    return false;
  }
  return (
    data.code === EMAIL_NOT_VERIFIED_CODE ||
    data.error === EMAIL_NOT_VERIFIED_CODE ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('verify your email'))
  );
}
