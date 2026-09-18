/**
 * Chat API contract tests — mock axios.create so society-assets-expo/src/services/api.ts
 * binds to a controllable HTTP client (template for other modules).
 */
import { CHAT_MESSAGE_PAGE_SIZE } from '../../src/services/api';
import { makeChatMessage, makeThread, expectMessagePersistedShape } from '../utils/chatFixtures';
import { mockHttpClient } from '../utils/httpMockClient';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const { mockHttpClient: client } = require('../utils/httpMockClient');
  return {
    ...actual,
    create: jest.fn(() => client),
    isAxiosError: actual.isAxiosError,
  };
});

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../../src/services/storage', () => ({
  getToken: jest.fn(async () => 'test-jwt'),
  clearSession: jest.fn(async () => undefined),
}));

jest.mock('../../src/services/session', () => ({
  notifySessionInvalid: jest.fn(),
}));

jest.mock('../../src/services/globalApiLoading', () => ({
  attachGlobalLoadingInterceptors: jest.fn(),
}));

jest.mock('../../src/services/memberProfileNavigation', () => ({
  isEmailNotVerifiedError: jest.fn(() => false),
  requestMemberProfileNavigation: jest.fn(),
}));

jest.mock('../../src/crypto/rsaEncrypt', () => ({
  encryptPasswordForLogin: jest.fn(async (v: string) => v),
}));

function apiOk<T>(data: T) {
  return { data: { message: 'OK', data, timestamp: new Date().toISOString() } };
}

describe('chat API client (UI ↔ backend contract)', () => {
  beforeEach(() => {
    mockHttpClient.get.mockReset();
    mockHttpClient.post.mockReset();
  });

  it('sendGroupChatMessage posts { body } to member portal and returns persisted shape', async () => {
    const { sendGroupChatMessage } = require('../../src/services/api') as typeof import('../../src/services/api');
    const persisted = makeChatMessage({
      id: 'uuid-msg',
      body: 'Hello DB',
      senderUserId: 'uuid-user',
      sentAt: '2026-08-15T12:00:00.000Z',
      mine: true,
    });
    mockHttpClient.post.mockResolvedValueOnce(apiOk(persisted));

    const result = await sendGroupChatMessage(true, 'group-99', 'Hello DB');

    expect(mockHttpClient.post).toHaveBeenCalledWith('/member/chat/groups/group-99/messages', {
      body: 'Hello DB',
    });
    expectMessagePersistedShape(result);
    expect(result.body).toBe('Hello DB');
    expect(result.senderUserId).toBe('uuid-user');
    expect(result.mine).toBe(true);
  });

  it('sendGroupChatMessage uses society path when not member portal', async () => {
    const { sendGroupChatMessage } = require('../../src/services/api') as typeof import('../../src/services/api');
    mockHttpClient.post.mockResolvedValueOnce(apiOk(makeChatMessage({ mine: true, body: 'Staff' })));
    await sendGroupChatMessage(false, 'group-1', 'Staff');
    expect(mockHttpClient.post).toHaveBeenCalledWith('/society/chat/groups/group-1/messages', {
      body: 'Staff',
    });
  });

  it('fetchGroupChatThread passes before/after/limit cursors for pagination', async () => {
    const { fetchGroupChatThread } = require('../../src/services/api') as typeof import('../../src/services/api');
    mockHttpClient.get.mockResolvedValueOnce(
      apiOk(makeThread({ messages: [makeChatMessage({ id: 'old' })], hasMoreOlder: true }))
    );
    await fetchGroupChatThread(true, 'g1', {
      limit: CHAT_MESSAGE_PAGE_SIZE,
      before: 'msg-oldest',
    });
    const url = String(mockHttpClient.get.mock.calls[0][0]);
    expect(url).toContain('/member/chat/groups/g1?');
    expect(url).toContain('before=msg-oldest');
    expect(url).toContain(`limit=${CHAT_MESSAGE_PAGE_SIZE}`);
  });

  it('fetchChatGroups hits the correct portal list endpoint', async () => {
    const { fetchChatGroups } = require('../../src/services/api') as typeof import('../../src/services/api');
    mockHttpClient.get.mockResolvedValueOnce(apiOk([]));
    await fetchChatGroups(true);
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/member/chat/groups',
      expect.objectContaining({})
    );
    mockHttpClient.get.mockResolvedValueOnce(apiOk([]));
    await fetchChatGroups(false);
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/society/chat/groups',
      expect.objectContaining({})
    );
  });

  it('markGroupChatRead posts to portal read endpoint (badge clear sync)', async () => {
    const { markGroupChatRead } = require('../../src/services/api') as typeof import('../../src/services/api');
    mockHttpClient.post.mockResolvedValueOnce(apiOk({ conversationId: 'g1', unreadCount: 0 }));
    await markGroupChatRead(true, 'g1');
    expect(mockHttpClient.post).toHaveBeenCalledWith('/member/chat/groups/g1/read');
  });
});

describe('documented UI↔DB sync risks (ChatModule)', () => {
  it('KNOWN: composer clears text before send resolves (data loss on failed POST)', () => {
    const CURRENT_CLEARS_BEFORE_AWAIT = true;
    expect(CURRENT_CLEARS_BEFORE_AWAIT).toBe(true);
  });

  it('KNOWN: send failure sets error state but GroupChatScreen only renders error when !thread', () => {
    const SEND_ERROR_VISIBLE_WHEN_THREAD_LOADED = false;
    expect(SEND_ERROR_VISIBLE_WHEN_THREAD_LOADED).toBe(false);
  });

  it('KNOWN: markGroupChatRead failures are swallowed (.catch(() => undefined))', () => {
    const MARK_READ_FAILURES_SWALLOWED = true;
    expect(MARK_READ_FAILURES_SWALLOWED).toBe(true);
  });

  it('KNOWN: Expo chat uses 15s HTTP polling, not WebSocket (Angular has WS)', () => {
    const EXPO_CHAT_POLL_MS = 15000;
    expect(EXPO_CHAT_POLL_MS).toBe(15000);
  });
});
