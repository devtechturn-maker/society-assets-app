import { clearSession } from './storage';
import { notifySessionInvalid } from './session';

/** Clears session and returns the user to the login screen. */
export async function performAppLogout(): Promise<void> {
  const { unregisterPushNotificationsFromBackend } = await import('./pushNotifications');
  await unregisterPushNotificationsFromBackend();
  await clearSession();
  notifySessionInvalid();
}
