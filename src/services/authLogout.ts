import { clearSession } from './storage';
import { notifySessionInvalid } from './session';
import { setBlockingMessage } from './globalApiLoading';

/** Clears session and returns the user to the login screen. */
export async function performAppLogout(): Promise<void> {
  setBlockingMessage('Signing out…');
  try {
    const { unregisterPushNotificationsFromBackend } = await import('./pushNotifications');
    await unregisterPushNotificationsFromBackend();
    await clearSession();
    notifySessionInvalid();
  } finally {
    setBlockingMessage(null);
  }
}
