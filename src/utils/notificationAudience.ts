import type { AppNotification } from '../types/api';

export type NotificationAudience = 'CHAIRMAN' | 'MEMBER' | 'GATEKEEPER';

const CHAIRMAN_TYPES = new Set(['COMPLAINT_CREATED', 'POLL_VOTED', 'THARAV_SIGNED',
  'MAINTENANCE_PAYMENT_SUBMITTED',
  'MAINTENANCE_UNPAID_SUMMARY',
  'CONTRACT_EXPIRY_REMINDER',
]);
const MEMBER_TYPES = new Set([
  'COMPLAINT_UPDATED',
  'POLL_CREATED',
  'POLL_RESULTS',
  'GROUP_ADDED',
  'AMENITY_BOOKED',
  'RULE_PUBLISHED',
  'NOTICE_PUBLISHED',
  'VISITOR_ARRIVED',
  'MEETING_SCHEDULED',
  'MEETING_UPDATED',
  'MEETING_CANCELLED',
  'THARAV_PUBLISHED',
  'STAFF_SALARY_PAID',
  'MAINTENANCE_PAYMENT_APPROVED',
  'MAINTENANCE_PAYMENT_REJECTED',
  'MAINTENANCE_DUE',
  'MAINTENANCE_GRACE_WARNING',
  'MAINTENANCE_PENDING',
  'MEETING_TOMORROW',
  'MEETING_SOON',
  'AMENITY_BOOKING_REMINDER',
  'EVENT_REMINDER',
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
