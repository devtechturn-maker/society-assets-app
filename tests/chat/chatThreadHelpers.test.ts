import {
  appendMessageIfNew,
  assertMessagesChronological,
  buildThreadRows,
  mergePolledMessages,
  normalizeThread,
  resolveFirstUnreadMessageId,
  unreadBadgeLabel,
} from '../../src/utils/chatThreadHelpers';
import { makeChatMessage, makeThread } from '../utils/chatFixtures';

describe('chatThreadHelpers', () => {
  describe('normalizeThread', () => {
    it('coerces missing arrays and counts safely', () => {
      const normalized = normalizeThread({
        conversationId: 'g1',
        peerName: '',
        unreadCount: undefined as unknown as number,
        messages: null as unknown as [],
      });
      expect(normalized.messages).toEqual([]);
      expect(normalized.unreadCount).toBe(0);
      expect(normalized.hasMoreOlder).toBe(false);
      expect(normalized.firstUnreadMessageId).toBeNull();
    });
  });

  describe('unreadBadgeLabel', () => {
    it('caps at 99+', () => {
      expect(unreadBadgeLabel(0)).toBe('0');
      expect(unreadBadgeLabel(12)).toBe('12');
      expect(unreadBadgeLabel(100)).toBe('99+');
    });
  });

  describe('resolveFirstUnreadMessageId', () => {
    it('returns null when unreadCount is 0', () => {
      const thread = makeThread({
        unreadCount: 0,
        messages: [makeChatMessage({ id: '1', mine: false })],
      });
      expect(resolveFirstUnreadMessageId(thread)).toBeNull();
    });

    it('walks from the end skipping mine messages', () => {
      const thread = makeThread({
        unreadCount: 2,
        messages: [
          makeChatMessage({ id: 'a', mine: false, sentAt: '2026-08-15T09:00:00.000Z' }),
          makeChatMessage({ id: 'b', mine: true, sentAt: '2026-08-15T09:01:00.000Z' }),
          makeChatMessage({ id: 'c', mine: false, sentAt: '2026-08-15T09:02:00.000Z' }),
          makeChatMessage({ id: 'd', mine: false, sentAt: '2026-08-15T09:03:00.000Z' }),
        ],
      });
      // unread 2 from end among others → c then d → first unread is c
      expect(resolveFirstUnreadMessageId(thread)).toBe('c');
    });
  });

  describe('buildThreadRows', () => {
    it('inserts unread divider before first unread message', () => {
      const messages = [
        makeChatMessage({ id: '1', mine: false }),
        makeChatMessage({ id: '2', mine: false }),
      ];
      const rows = buildThreadRows(messages, '2', 1);
      expect(rows.map((r) => r.kind)).toEqual(['message', 'divider', 'message']);
      expect(rows[1]).toMatchObject({ kind: 'divider', key: 'unread-divider' });
    });

    it('skips divider when openedUnreadCount is 0 (empty state path stays clean)', () => {
      const rows = buildThreadRows([makeChatMessage({ id: '1' })], '1', 0);
      expect(rows).toHaveLength(1);
      expect(rows[0].kind).toBe('message');
    });
  });

  describe('appendMessageIfNew / mergePolledMessages', () => {
    it('prevents duplicate IDs from send+poll race', () => {
      const existing = [makeChatMessage({ id: '1', body: 'Hi' })];
      const same = makeChatMessage({ id: '1', body: 'Hi' });
      expect(appendMessageIfNew(existing, same)).toHaveLength(1);
      expect(mergePolledMessages(existing, [same, makeChatMessage({ id: '2', body: 'Yo' })])).toEqual([
        existing[0],
        expect.objectContaining({ id: '2', body: 'Yo' }),
      ]);
    });

    it('replaces optimistic sending row when server message arrives', () => {
      const optimistic = makeChatMessage({
        id: 'local-1',
        clientId: 'local-1',
        body: 'Hi',
        mine: true,
        localStatus: 'sending',
        sentAt: '2026-08-15T10:00:00.000Z',
      });
      const server = makeChatMessage({
        id: 'srv-9',
        body: 'Hi',
        mine: true,
        sentAt: '2026-08-15T10:00:01.000Z',
      });
      const next = appendMessageIfNew([optimistic], server);
      expect(next).toHaveLength(1);
      expect(next[0]).toMatchObject({ id: 'srv-9', body: 'Hi', clientId: 'local-1' });
      expect(next[0].localStatus).toBeUndefined();
    });

    it('preserves chronological order for emoji and long text payloads', () => {
      const messages = [
        makeChatMessage({ id: '1', body: '🙂', sentAt: '2026-08-15T10:00:00.000Z' }),
        makeChatMessage({
          id: '2',
          body: 'A'.repeat(500) + ' <script>&',
          sentAt: '2026-08-15T10:00:01.000Z',
        }),
      ];
      expect(assertMessagesChronological(messages)).toBe(true);
      expect(
        assertMessagesChronological([
          makeChatMessage({ id: '2', sentAt: '2026-08-15T10:00:02.000Z' }),
          makeChatMessage({ id: '1', sentAt: '2026-08-15T10:00:01.000Z' }),
        ])
      ).toBe(false);
    });
  });
});
