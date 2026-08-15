import { clearSession } from './storage';
import { notifySessionInvalid } from './session';
import { withBlockingLoader } from './globalApiLoading';

/** Clears session and returns the user to the login screen. */
export async function performAppLogout(): Promise<void> {
  await withBlockingLoader('Signing out…', async () => {
    const { unregisterPushNotificationsFromBackend } = await import('./pushNotifications');
    await unregisterPushNotificationsFromBackend();
    await clearSession();
    notifySessionInvalid();
  });
}
