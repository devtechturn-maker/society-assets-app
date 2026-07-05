export const POLL_EXPIRY_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '24 hours', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '7 days', minutes: 10080 },
] as const;

export const DEFAULT_POLL_EXPIRY_MINUTES = 1440;

export function formatPollTimeRemaining(
  expiresAt: string | null | undefined,
  expired?: boolean,
  status?: string
): string {
  if (!expiresAt) return '';
  if (expired || status === 'CLOSED') {
    const end = new Date(expiresAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) {
      return 'Expired';
    }
  }
  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return '';
  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }
  return `${Math.max(minutes, 1)}m left`;
}
