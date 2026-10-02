import type { Ionicons } from '@expo/vector-icons';
import type {
  EventContributionStatus,
  EventEntryStatus,
  EventPaymentMethod,
  SocietyEventInfo,
  SocietyEventPhase,
  SocietyEventType,
} from '../types/api';

type IconName = keyof typeof Ionicons.glyphMap;

export const EVENT_TYPE_OPTIONS: { label: string; value: SocietyEventType; icon: IconName }[] = [
  { label: 'Festival', value: 'FESTIVAL', icon: 'sparkles-outline' },
  { label: 'Event', value: 'EVENT', icon: 'calendar-outline' },
  { label: 'Function', value: 'FUNCTION', icon: 'people-outline' },
  { label: 'Sports', value: 'SPORTS', icon: 'trophy-outline' },
  { label: 'Cultural', value: 'CULTURAL', icon: 'color-palette-outline' },
  { label: 'Other', value: 'OTHER', icon: 'pricetag-outline' },
];

export const PAYMENT_METHODS: { label: string; value: EventPaymentMethod }[] = [
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Other', value: 'OTHER' },
];

export function eventTypeIcon(type: SocietyEventType): IconName {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? 'sparkles-outline';
}

export function eventTypeLabel(event: Pick<SocietyEventInfo, 'eventType' | 'customTypeLabel'>): string {
  return event.customTypeLabel || EVENT_TYPE_OPTIONS.find((o) => o.value === event.eventType)?.label || 'Event';
}

export function phaseLabel(phase: SocietyEventPhase): string {
  switch (phase) {
    case 'UPCOMING':
      return 'Upcoming';
    case 'ONGOING':
      return 'Ongoing';
    case 'ENDED':
      return 'Ended';
    case 'CLOSED':
      return 'Closed';
    case 'CANCELLED':
      return 'Cancelled';
  }
}

export function phaseTone(phase: SocietyEventPhase): 'success' | 'info' | 'warn' | 'neutral' {
  if (phase === 'ONGOING') return 'success';
  if (phase === 'UPCOMING') return 'info';
  if (phase === 'ENDED') return 'warn';
  return 'neutral';
}

export function contributionLabel(status: EventContributionStatus, voluntary = false): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Part paid';
    case 'EXEMPT':
      return 'Exempt';
    default:
      return voluntary ? 'Not yet' : 'Pending';
  }
}

export function contributionTone(status: EventContributionStatus): 'success' | 'warn' | 'neutral' | 'info' {
  if (status === 'PAID') return 'success';
  if (status === 'EXEMPT') return 'neutral';
  return 'warn';
}

export function entryStatusLabel(status: EventEntryStatus | 'VOID'): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Done';
    case 'PENDING_VERIFICATION':
      return 'To verify';
    case 'PENDING_APPROVAL':
      return 'Needs approval';
    case 'UNPAID':
      return 'Bill to pay';
    case 'REJECTED':
      return 'Rejected';
    case 'VOID':
      return 'Void';
  }
}

export function paymentMethodLabel(method?: EventPaymentMethod | null): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? '—';
}

/** ₹85,000 → "₹85K", ₹1,25,000 → "₹1.25L" — for compact cards. */
export function compactInr(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const trim = (n: number) => n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2).replace(/\.?0+$/, '');
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dateRange(start?: string | null, end?: string | null): string {
  if (!start) return '';
  if (!end || end === start) return shortDate(start);
  return `${shortDate(start)} – ${shortDate(end)}`;
}
