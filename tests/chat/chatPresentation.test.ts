import {
  buildPresentationRows,
  formatChatDayLabel,
  formatSmartChatTime,
  resolveDeliveryStatus,
} from '../../src/utils/chatPresentation';
import { makeChatMessage } from '../utils/chatFixtures';

describe('chatPresentation', () => {
  describe('formatChatDayLabel', () => {
    const now = new Date('2026-08-15T15:00:00.000Z');

    it('labels today and yesterday', () => {
      expect(formatChatDayLabel('2026-08-15T10:00:00.000Z', now)).toBe('Today');
      expect(formatChatDayLabel('2026-08-14T10:00:00.000Z', now)).toBe('Yesterday');
    });

    it('returns empty for invalid dates', () => {
      expect(formatChatDayLabel(null)).toBe('');
      expect(formatChatDayLabel('not-a-date')).toBe('');
    });
  });

  describe('formatSmartChatTime', () => {
    const now = new Date('2026-08-15T15:00:00.000Z');

    it('shows time-only for same day', () => {
      const label = formatSmartChatTime('2026-08-15T10:05:00.000Z', now);
      expect(label).toMatch(/\d/);
      expect(label.toLowerCase()).not.toMatch(/aug/);
    });

    it('includes date for older messages', () => {
      const label = formatSmartChatTime('2026-08-10T10:05:00.000Z', now);
      expect(label.toLowerCase()).toMatch(/aug/);
    });
  });

  describe('resolveDeliveryStatus', () => {
    it('maps local and read states', () => {
      expect(
        resolveDeliveryStatus(makeChatMessage({ mine: true, localStatus: 'sending' }))
      ).toBe('sending');
      expect(
        resolveDeliveryStatus(makeChatMessage({ mine: true, localStatus: 'failed' }))
      ).toBe('failed');
      expect(
        resolveDeliveryStatus(
          makeChatMessage({ mine: true, readAt: '2026-08-15T11:00:00.000Z', localStatus: undefined })
        )
      ).toBe('read');
      expect(resolveDeliveryStatus(makeChatMessage({ mine: true, readAt: null }))).toBe('sent');
    });
  });

  describe('buildPresentationRows', () => {
    it('inserts date separators when the day changes', () => {
      const rows = buildPresentationRows(
        [
          makeChatMessage({
            id: '1',
            senderUserId: 'a',
            sentAt: '2026-08-14T10:00:00.000Z',
          }),
          makeChatMessage({
            id: '2',
            senderUserId: 'a',
            sentAt: '2026-08-15T10:00:00.000Z',
          }),
        ],
        null,
        0
      );
      expect(rows.filter((row) => row.kind === 'date')).toHaveLength(2);
      expect(rows.map((row) => row.kind)).toEqual([
        'date',
        'message',
        'date',
        'message',
      ]);
    });

    it('clusters consecutive same-sender messages within 2 minutes', () => {
      const rows = buildPresentationRows(
        [
          makeChatMessage({
            id: '1',
            mine: false,
            senderUserId: 'a',
            sentAt: '2026-08-15T10:00:00.000Z',
          }),
          makeChatMessage({
            id: '2',
            mine: false,
            senderUserId: 'a',
            sentAt: '2026-08-15T10:00:30.000Z',
          }),
          makeChatMessage({
            id: '3',
            mine: false,
            senderUserId: 'b',
            sentAt: '2026-08-15T10:00:45.000Z',
          }),
        ],
        null,
        0
      );
      const messages = rows.filter((row) => row.kind === 'message');
      expect(messages[0]).toMatchObject({
        kind: 'message',
        showSenderMeta: true,
        clusteredWithPrevious: false,
      });
      expect(messages[1]).toMatchObject({
        kind: 'message',
        showSenderMeta: false,
        clusteredWithPrevious: true,
      });
      expect(messages[2]).toMatchObject({
        kind: 'message',
        showSenderMeta: true,
        clusteredWithPrevious: false,
      });
    });

    it('inserts unread divider before first unread message', () => {
      const rows = buildPresentationRows(
        [
          makeChatMessage({ id: '1', mine: false }),
          makeChatMessage({ id: '2', mine: false }),
        ],
        '2',
        1
      );
      expect(rows.map((row) => row.kind)).toEqual(['date', 'message', 'unread', 'message']);
      expect(rows[2]).toMatchObject({ kind: 'unread', key: 'unread-divider', count: 1 });
    });

    it('hides sender meta for mine messages', () => {
      const rows = buildPresentationRows(
        [makeChatMessage({ id: '1', mine: true, senderUserId: 'me' })],
        null,
        0
      );
      const messageRow = rows.find((row) => row.kind === 'message');
      expect(messageRow).toMatchObject({
        kind: 'message',
        showSenderMeta: false,
        clusteredWithPrevious: false,
      });
    });
  });
});
