import { Client, type IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '../config/env';
import { getToken } from './storage';
import type { ChatMessage } from '../types/api';

export type ChatRealtimeEvent =
  | {
      type: 'NEW_MESSAGE';
      groupId: string;
      groupName?: string;
      lastMessagePreview?: string | null;
      lastMessageAt?: string | null;
      message: ChatMessage & { senderUserId: string; mine?: boolean };
    }
  | {
      type: 'GROUP_UPDATED';
      group: {
        conversationId: string;
        groupName?: string;
        lastMessagePreview?: string | null;
        lastMessageAt?: string | null;
        unreadCount?: number;
        memberCount?: number;
      };
    }
  | { type: 'READ'; groupId: string; userId: string }
  | {
      type: 'TYPING';
      groupId: string;
      societyId?: string;
      userId: string;
      userName?: string;
      typing: boolean;
    }
  | {
      type: 'POLL_UPDATED';
      groupId: string;
      pollId: string;
      poll: unknown;
    };

type Handlers = {
  onEvent?: (event: ChatRealtimeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
};

function wsBaseUrl(): string {
  return API_BASE_URL.replace(/^http/i, 'ws');
}

let activeClient: Client | null = null;
let activeSocietyId: string | null = null;
let activeHandlers: Handlers = {};

export async function connectChatRealtime(
  societyId: string,
  handlers: Handlers
): Promise<() => void> {
  if (!societyId) {
    return () => undefined;
  }

  activeHandlers = handlers;

  const token = await getToken();
  if (!token) {
    return () => undefined;
  }

  if (activeClient && activeSocietyId === societyId) {
    return () => disconnectChatRealtime();
  }

  disconnectChatRealtime();
  activeSocietyId = societyId;

  const client = new Client({
    brokerURL: `${wsBaseUrl()}/ws-native`,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      activeHandlers.onConnectionChange?.(true);
      client.subscribe(`/topic/society/${societyId}/chat`, (message: IMessage) => {
        handleMessage(message);
      });
    },
    onDisconnect: () => {
      activeHandlers.onConnectionChange?.(false);
    },
    onStompError: () => {
      activeHandlers.onConnectionChange?.(false);
    },
    onWebSocketError: () => {
      activeHandlers.onConnectionChange?.(false);
    },
  });

  activeClient = client;
  client.activate();

  return () => disconnectChatRealtime();
}

export function disconnectChatRealtime(): void {
  if (activeClient) {
    activeClient.deactivate();
    activeClient = null;
  }
  activeSocietyId = null;
  activeHandlers = {};
}

export function publishChatTyping(input: {
  societyId: string;
  groupId: string;
  typing: boolean;
}): void {
  if (!activeClient?.connected) return;
  activeClient.publish({
    destination: '/app/chat/typing',
    body: JSON.stringify({
      societyId: input.societyId,
      groupId: input.groupId,
      typing: input.typing,
    }),
  });
}

function handleMessage(message: IMessage): void {
  if (!message.body) return;
  try {
    const event = JSON.parse(message.body) as ChatRealtimeEvent;
    if (event?.type) {
      activeHandlers.onEvent?.(event);
    }
  } catch {
    /* ignore malformed */
  }
}
