/**
 * Pure chat-thread helpers extracted for unit testing.
 * Behavior matches the previous inline implementations in ChatModule.
 */
import type { ChatMessage, ChatThread } from '../types/api';

export type ThreadRow =
  | { kind: 'divider'; key: string }
  | { kind: 'message'; key: string; message: ChatMessage };

export function normalizeThread(data: ChatThread): ChatThread {
  return {
    ...data,
    unreadCount: Number(data.unreadCount ?? 0),
    hasMoreOlder: Boolean(data.hasMoreOlder),
    firstUnreadMessageId: data.firstUnreadMessageId ? String(data.firstUnreadMessageId) : null,
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

export function unreadBadgeLabel(count: number): string {
  const value = Number(count ?? 0);
  if (value > 99) return '99+';
  return String(value);
}

export function resolveFirstUnreadMessageId(thread: ChatThread): string | null {
  const unreadCount = Math.max(0, Math.floor(Number(thread.unreadCount ?? 0)));
  if (unreadCount <= 0) return null;

  let othersFromEnd = 0;
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const message = thread.messages[i];
    if (message.mine) continue;
    othersFromEnd++;
    if (othersFromEnd === unreadCount) {
      return String(message.id);
    }
  }
  return null;
}

export function buildThreadRows(
  messages: ChatMessage[],
  firstUnreadMessageId: string | null,
  openedUnreadCount: number
): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (const message of messages) {
    if (
      openedUnreadCount > 0 &&
      firstUnreadMessageId &&
      String(message.id) === firstUnreadMessageId
    ) {
      rows.push({ kind: 'divider', key: 'unread-divider' });
    }
    rows.push({ kind: 'message', key: String(message.id), message });
  }
  return rows;
}

const OPTIMISTIC_MATCH_MS = 15_000;

/** Dedupes by id; replaces optimistic rows by clientId or recent same-body mine. */
export function appendMessageIfNew(
  messages: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  if (messages.some((row) => String(row.id) === String(incoming.id))) {
    return messages;
  }

  if (incoming.clientId) {
    const byClient = messages.findIndex(
      (row) => row.clientId && row.clientId === incoming.clientId
    );
    if (byClient >= 0) {
      const next = [...messages];
      next[byClient] = {
        ...incoming,
        clientId: messages[byClient].clientId,
        localStatus: undefined,
      };
      return next;
    }
  }

  if (incoming.mine) {
    const incomingMs = incoming.sentAt ? Date.parse(String(incoming.sentAt)) : Date.now();
    const byOptimistic = messages.findIndex((row) => {
      if (!row.mine || (row.localStatus !== 'sending' && row.localStatus !== 'failed')) {
        return false;
      }
      if (String(row.body ?? '') !== String(incoming.body ?? '')) return false;
      const rowMs = row.sentAt ? Date.parse(String(row.sentAt)) : 0;
      if (!rowMs || Number.isNaN(incomingMs)) return true;
      return Math.abs(incomingMs - rowMs) <= OPTIMISTIC_MATCH_MS;
    });
    if (byOptimistic >= 0) {
      const next = [...messages];
      next[byOptimistic] = {
        ...incoming,
        clientId: messages[byOptimistic].clientId ?? incoming.clientId,
        localStatus: undefined,
      };
      return next;
    }
  }

  return [...messages, incoming];
}

/**
 * Merge polled "after" messages into an existing thread list, preserving order
 * and skipping duplicates.
 */
export function mergePolledMessages(
  existing: ChatMessage[],
  polled: ChatMessage[]
): ChatMessage[] {
  if (!polled.length) return existing;
  const seen = new Set(existing.map((m) => String(m.id)));
  const next = [...existing];
  for (const message of polled) {
    const id = String(message.id);
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(message);
  }
  return next;
}

/** Chronological order check — API returns oldest→newest in the page. */
export function assertMessagesChronological(messages: ChatMessage[]): boolean {
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1].sentAt ? Date.parse(String(messages[i - 1].sentAt)) : NaN;
    const curr = messages[i].sentAt ? Date.parse(String(messages[i].sentAt)) : NaN;
    if (Number.isNaN(prev) || Number.isNaN(curr)) continue;
    if (curr < prev) return false;
  }
  return true;
}
