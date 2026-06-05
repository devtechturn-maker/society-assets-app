import axios from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { AppState, Platform } from 'react-native';
import { registerDevicePushToken, unregisterDevicePushToken } from './api';

export type ChatPushNotification = {
  groupId: string;
  groupName: string;
  preview: string;
  type: 'GROUP_CHAT' | 'GROUP_ADDED';
};

let cachedExpoPushToken: string | null = null;
let initialized = false;
let expoGoWarningLogged = false;

export function configurePushNotifications(): void {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const isForeground = AppState.currentState === 'active';
      return {
        shouldShowAlert: !isForeground,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: !isForeground,
        shouldShowList: true,
      };
    },
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Society Assets · Group Chat',
    description: 'Chat messages and group updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#70088c',
    sound: 'default',
  });
}

function resolveProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function logPushSkip(reason: string): void {
  if (__DEV__) {
    console.warn(`[push] ${reason}`);
  }
}

function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const detail = data?.message ?? data?.error;
    if (detail) {
      return `${detail} (HTTP ${error.response?.status ?? 'unknown'})`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

function logExpoGoLimitationOnce(): void {
  if (expoGoWarningLogged || !__DEV__ || !isRunningInExpoGo()) return;
  expoGoWarningLogged = true;
  logPushSkip(
    'Expo Go always shows Expo notification UI when the app is in background. Install the Society Assets dev build for your logo and branded system notifications: npm run build:ios:dev (or npx expo run:ios on a Mac).'
  );
}

/** System notifications use the installed app icon only in a dev/production build, not Expo Go. */
export function usesBrandedSystemNotifications(): boolean {
  return isRemotePushAvailable() && !isRunningInExpoGo();
}

/** Physical device required. Expo Go can obtain a token but delivery needs a dev/production build. */
export function isRemotePushAvailable(): boolean {
  return Device.isDevice;
}

export function isExpoGoPushLimited(): boolean {
  return isRunningInExpoGo();
}

export async function obtainExpoPushToken(): Promise<string | null> {
  logExpoGoLimitationOnce();

  if (!isRemotePushAvailable()) {
    logPushSkip('Push tokens need a physical phone — emulators are not supported.');
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    logPushSkip('Notification permission was denied — allow notifications in phone settings.');
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    logPushSkip(
      'Missing EAS project ID. Add EXPO_PUBLIC_EAS_PROJECT_ID to .env or set extra.eas.projectId in app.json, then restart with npx expo start -c.'
    );
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedExpoPushToken = tokenResponse.data;
    if (__DEV__) {
      console.log('[push] Expo token obtained:', cachedExpoPushToken);
    }
    return cachedExpoPushToken;
  } catch (error) {
    logPushSkip(`Failed to get Expo push token: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function registerPushNotificationsWithBackend(): Promise<void> {
  configurePushNotifications();
  const token = await obtainExpoPushToken();
  if (!token) return;
  try {
    await registerDevicePushToken(token, Platform.OS);
    if (__DEV__) {
      console.log('[push] Token registered with backend');
      if (isExpoGoPushLimited()) {
        logPushSkip('Token saved on server. Use a development build to receive notifications on this device.');
      }
    }
  } catch (error) {
    logPushSkip(`Backend registration failed: ${formatApiError(error)}`);
  }
}

export async function unregisterPushNotificationsFromBackend(): Promise<void> {
  const token = cachedExpoPushToken;
  try {
    await unregisterDevicePushToken(token ?? undefined);
  } catch {
    /* best effort on logout */
  }
  cachedExpoPushToken = null;
}

type PushData = {
  type?: string;
  groupId?: string;
  groupName?: string;
  senderName?: string;
};

function parseChatPushNotification(
  content: Notifications.NotificationContent | null | undefined
): ChatPushNotification | null {
  if (!content) return null;
  const data = content.data as PushData;
  if (data?.type !== 'GROUP_CHAT' && data?.type !== 'GROUP_ADDED') {
    return null;
  }
  const groupId = data.groupId ? String(data.groupId) : '';
  if (!groupId) return null;

  const groupName =
    (data.groupName && String(data.groupName).trim()) ||
    (content.subtitle && String(content.subtitle).trim()) ||
    (content.title && String(content.title).trim()) ||
    'Group Chat';

  const preview =
    (content.body && String(content.body).trim()) ||
    (data.type === 'GROUP_ADDED' ? 'You were added to this group' : 'New message');

  return {
    groupId,
    groupName,
    preview,
    type: data.type,
  };
}

function extractNotificationContent(
  notification: Notifications.Notification | null | undefined
): Notifications.NotificationContent | null {
  return notification?.request?.content ?? null;
}

function extractChatGroupId(
  response: Notifications.NotificationResponse | null | undefined
): string | undefined {
  return parseChatPushNotification(extractNotificationContent(response?.notification))?.groupId;
}

export function openChatFromNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined,
  onOpenChat: (groupId?: string) => void
): boolean {
  const groupId = extractChatGroupId(response);
  if (!groupId) return false;
  onOpenChat(groupId);
  return true;
}

export async function resolveInitialNotificationGroupId(): Promise<string | undefined> {
  if (!isRemotePushAvailable()) return undefined;
  const response = await Notifications.getLastNotificationResponseAsync();
  return extractChatGroupId(response);
}

export function addNotificationResponseListener(
  onOpenChat: (groupId?: string) => void
): Notifications.Subscription {
  if (!isRemotePushAvailable()) {
    return { remove: () => undefined };
  }
  return Notifications.addNotificationResponseReceivedListener((response) => {
    openChatFromNotificationResponse(response, onOpenChat);
  });
}

export function addNotificationReceivedListener(
  onReceived: (notification: ChatPushNotification) => void
): Notifications.Subscription {
  if (!isRemotePushAvailable()) {
    return { remove: () => undefined };
  }
  return Notifications.addNotificationReceivedListener((notification) => {
    const parsed = parseChatPushNotification(extractNotificationContent(notification));
    if (parsed) {
      onReceived(parsed);
    }
  });
}
