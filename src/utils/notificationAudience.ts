import type { AppNotification } from '../types/api';

export type NotificationAudience = 'CHAIRMAN' | 'MEMBER' | 'GATEKEEPER';

const CHAIRMAN_TYPES = new Set(['COMPLAINT_CREATED', 'POLL_VOTED']);
const MEMBER_TYPES = new Set([
  'COMPLAINT_UPDATED',
  'POLL_CREATED',
  'POLL_RESULTS',
  'GROUP_ADDED',
  'AMENITY_BOOKED',
  'RULE_PUBLISHED',
  'NOTICE_PUBLISHED',
  'VISITOR_ARRIVED',
]);
const GATEKEEPER_TYPES = new Set(['VISITOR_APPROVED', 'VISITOR_REJECTED']);
const SHARED_TYPES = new Set(['GROUP_CHAT', 'GENERAL']);

export function notificationMatchesAudience(
  item: Pick<AppNotification, 'type' | 'audienceRole'>,
  audience: NotificationAudience
): boolean {
  if (item.audienceRole === audience) {
    return true;
  }
  if (item.audienceRole && item.audienceRole !== audience) {
    return false;
  }

  const type = (item.type ?? '').trim().toUpperCase();
  if (SHARED_TYPES.has(type)) {
    return true;
  }
  if (audience === 'CHAIRMAN' && CHAIRMAN_TYPES.has(type)) {
    return true;
  }
  if (audience === 'MEMBER' && MEMBER_TYPES.has(type)) {
    return true;
  }
  if (audience === 'GATEKEEPER' && GATEKEEPER_TYPES.has(type)) {
    return true;
  }
  return false;
}

export function pushTypeMatchesAudience(type: string | undefined, audience: NotificationAudience): boolean {
  return notificationMatchesAudience({ type: type ?? 'GENERAL' }, audience);
}
