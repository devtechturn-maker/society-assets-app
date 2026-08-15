import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { playVisitorNotificationSound } from './visitorNotificationSounds';

/** Must match registerTaskAsync / defineTask name. */
export const BACKGROUND_VISITOR_NOTIFICATION_TASK = 'BACKGROUND-VISITOR-NOTIFICATION-TASK';

function readVisitorType(payload: Notifications.NotificationTaskPayload): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // User tapped a notification action/response
  if ('actionIdentifier' in payload) {
    const data = payload.notification?.request?.content?.data as Record<string, unknown> | undefined;
    const type = data?.type;
    return typeof type === 'string' && type.startsWith('VISITOR_') ? type : null;
  }

  // Remote notification received in background / headless
  const remote = payload as {
    notification?: Record<string, unknown> | null;
    data?: { dataString?: string; type?: string; [key: string]: unknown };
  };

  const directType = remote.data?.type;
  if (typeof directType === 'string' && directType.startsWith('VISITOR_')) {
    return directType;
  }

  if (typeof remote.data?.dataString === 'string') {
    try {
      const parsed = JSON.parse(remote.data.dataString) as { type?: string };
      if (typeof parsed.type === 'string' && parsed.type.startsWith('VISITOR_')) {
        return parsed.type;
      }
    } catch {
      /* ignore */
    }
  }

  const nestedData = remote.notification?.request as
    | { content?: { data?: Record<string, unknown> } }
    | undefined;
  const nestedType = nestedData?.content?.data?.type;
  if (typeof nestedType === 'string' && nestedType.startsWith('VISITOR_')) {
    return nestedType;
  }

  const contentData = (remote.notification as { data?: Record<string, unknown> } | null)?.data;
  const contentType = contentData?.type;
  if (typeof contentType === 'string' && contentType.startsWith('VISITOR_')) {
    return contentType;
  }

  return null;
}

/**
 * Defined at module scope so Expo can load it in a headless JS context.
 * Plays visitor WAVs when a push arrives while the app is backgrounded.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_VISITOR_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error) {
      if (__DEV__) {
        console.warn('[push] background visitor task error', error);
      }
      return;
    }

    // Foreground path already plays via notification handler / received listener.
    if (AppState.currentState === 'active') {
      return;
    }

    const type = readVisitorType(data);
    if (!type) {
      return;
    }

    await playVisitorNotificationSound(type);
  }
);

let registered = false;

export async function registerBackgroundVisitorNotificationTask(): Promise<void> {
  if (registered) {
    return;
  }
  try {
    await Notifications.registerTaskAsync(BACKGROUND_VISITOR_NOTIFICATION_TASK);
    registered = true;
    if (__DEV__) {
      console.log('[push] background visitor sound task registered');
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[push] failed to register background visitor task', e);
    }
  }
}
