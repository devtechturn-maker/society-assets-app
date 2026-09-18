import type { ChatMessage } from '../types/api';

export type ChatDeliveryStatus = 'sending' | 'sent' | 'read' | 'failed';

export type PresentationRow =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'unread'; key: string; count: number }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      showSenderMeta: boolean;
      clusteredWithPrevious: boolean;
    };

const CLUSTER_MS = 2 * 60 * 1000;

function dayKey(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatChatDayLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function formatSmartChatTime(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Derive WhatsApp-like tick state from existing fields (no delivered_at without schema). */
export function resolveDeliveryStatus(message: ChatMessage): ChatDeliveryStatus {
  if (message.localStatus === 'sending') return 'sending';
  if (message.localStatus === 'failed') return 'failed';
  if (message.mine && message.readAt) return 'read';
  if (message.mine) return 'sent';
  return 'sent';
}

export function buildPresentationRows(
  messages: ChatMessage[],
  firstUnreadMessageId: string | null,
  openedUnreadCount: number
): PresentationRow[] {
  const rows: PresentationRow[] = [];
  let lastDay: string | null = null;
  let lastSender: string | null = null;
  let lastSentAtMs = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const day = dayKey(message.sentAt);
    if (day !== lastDay) {
      rows.push({
        kind: 'date',
        key: `date-${day}-${message.id}`,
        label: formatChatDayLabel(message.sentAt),
      });
      lastDay = day;
      lastSender = null;
      lastSentAtMs = 0;
    }

    if (
      openedUnreadCount > 0 &&
      firstUnreadMessageId &&
      String(message.id) === String(firstUnreadMessageId)
    ) {
      rows.push({ kind: 'unread', key: 'unread-divider', count: openedUnreadCount });
      lastSender = null;
      lastSentAtMs = 0;
    }

    const sentAtMs = message.sentAt ? Date.parse(String(message.sentAt)) : 0;
    const sameSender = lastSender != null && lastSender === String(message.senderUserId);
    const closeInTime =
      lastSentAtMs > 0 && sentAtMs > 0 && Math.abs(sentAtMs - lastSentAtMs) <= CLUSTER_MS;
    const clusteredWithPrevious = Boolean(sameSender && closeInTime);
    const showSenderMeta = !message.mine && !clusteredWithPrevious;

    rows.push({
      kind: 'message',
      key: String(message.clientId ?? message.id),
      message,
      showSenderMeta,
      clusteredWithPrevious,
    });

    lastSender = String(message.senderUserId ?? '');
    lastSentAtMs = sentAtMs || lastSentAtMs;
  }

  return rows;
}

export function createLocalClientId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
