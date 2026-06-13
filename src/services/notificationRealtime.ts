import { Client, type IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '../config/env';
import { getToken } from './storage';
import type { AppNotification } from '../types/api';

export type NotificationRealtimeEvent =
  | {
      type: 'NOTIFICATION_UPSERT';
      notification: AppNotification;
      unreadCount: number;
    }
  | {
      type: 'UNREAD_COUNT';
      unreadCount: number;
    };

type Handlers = {
  onEvent?: (event: NotificationRealtimeEvent) => void;
};

function wsBaseUrl(): string {
  return API_BASE_URL.replace(/^http/i, 'ws');
}

let activeClient: Client | null = null;
let activeUserId: string | null = null;
let activeHandlers: Handlers = {};

export async function connectNotificationRealtime(
  userId: string,
  handlers: Handlers
): Promise<() => void> {
  if (!userId) {
    return () => undefined;
  }

  activeHandlers = handlers;

  const token = await getToken();
  if (!token) {
    return () => undefined;
  }

  if (activeClient && activeUserId === userId) {
    return () => disconnectNotificationRealtime();
  }

  disconnectNotificationRealtime();
  activeUserId = userId;

  const client = new Client({
    brokerURL: `${wsBaseUrl()}/ws-native`,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe(`/topic/user/${userId}/notifications`, (message: IMessage) => {
        handleMessage(message);
      });
    },
    onStompError: () => {
      /* reconnectDelay handles retries */
    },
    onWebSocketError: () => {
      /* reconnectDelay handles retries */
    },
  });

  activeClient = client;
  client.activate();

  return () => disconnectNotificationRealtime();
}

export function disconnectNotificationRealtime(): void {
  if (activeClient) {
    activeClient.deactivate();
    activeClient = null;
  }
  activeUserId = null;
  activeHandlers = {};
}

function handleMessage(message: IMessage): void {
  if (!message.body) {
    return;
  }
  try {
    const event = JSON.parse(message.body) as NotificationRealtimeEvent;
    if (event?.type) {
      activeHandlers.onEvent?.(event);
    }
  } catch {
    /* ignore malformed payloads */
  }
}
