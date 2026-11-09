import { clearSession } from './storage';
import { notifySessionInvalid } from './session';
import { withBlockingLoader } from './globalApiLoading';
import { wipeSecureCache } from './secureFileCache';

/** Clears session and returns the user to the login screen. */
export async function performAppLogout(): Promise<void> {
  await withBlockingLoader('Signing out…', async () => {
    const { unregisterPushNotificationsFromBackend } = await import('./pushNotifications');
    await unregisterPushNotificationsFromBackend();
    const { revokeServerSession } = await import('./api');
    await revokeServerSession();
    await clearSession();
    // Downloaded documents and photos must not outlive the session on this phone.
    await wipeSecureCache();
    notifySessionInvalid();
  });
}
