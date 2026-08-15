import type { ChatMessage, ChatThread } from '../../src/types/api';

/** Stable fixtures for chat module tests — reusable pattern for other modules. */
export function makeChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: overrides.id ?? 'msg-1',
    body: overrides.body ?? 'Hello',
    messageType: overrides.messageType ?? 'TEXT',
    sentAt: overrides.sentAt ?? '2026-08-15T10:00:00.000Z',
    readAt: overrides.readAt ?? null,
    senderUserId: overrides.senderUserId ?? 'user-1',
    senderName: overrides.senderName ?? 'Alice · A-101',
    senderRole: overrides.senderRole ?? 'MEMBER',
    senderFlat: overrides.senderFlat ?? 'A-101',
    mine: overrides.mine ?? false,
    pollId: overrides.pollId,
    poll: overrides.poll,
    attachmentUrl: overrides.attachmentUrl,
    localPreviewUri: overrides.localPreviewUri,
    clientId: overrides.clientId,
    localStatus: overrides.localStatus,
  };
}

export function makeThread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    conversationId: overrides.conversationId ?? 'group-1',
    groupName: overrides.groupName ?? 'Block A',
    societyName: overrides.societyName ?? 'Suhyog',
    peerName: overrides.peerName ?? '',
    unreadCount: overrides.unreadCount ?? 0,
    firstUnreadMessageId: overrides.firstUnreadMessageId ?? null,
    memberCount: overrides.memberCount ?? 4,
    messages: overrides.messages ?? [],
    hasMoreOlder: overrides.hasMoreOlder ?? false,
  };
}

/** Asserts the API contract fields the UI relies on for DB sync. */
export function expectMessagePersistedShape(message: ChatMessage) {
  expect(message).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      body: expect.any(String),
      senderUserId: expect.any(String),
      sentAt: expect.anything(),
      mine: expect.any(Boolean),
    })
  );
  expect(String(message.id).length).toBeGreaterThan(0);
  expect(String(message.senderUserId).length).toBeGreaterThan(0);
}
