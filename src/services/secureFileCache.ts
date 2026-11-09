import * as FileSystem from 'expo-file-system/legacy';

/**
 * Society documents and photos downloaded for viewing go in one private folder inside the app cache,
 * so they can be wiped in one step. Android keeps the app cache private to this app, but a copy left
 * behind after logout could still be read by the next person signed in on the phone; we wipe it on
 * logout and on every cold start.
 */
const SECURE_DIR_NAME = 'secure-docs/';

/** A wipe in progress; downloads wait for it so a fresh file is never deleted mid-write. */
let wipeInFlight: Promise<void> | null = null;

export async function secureCacheDir(): Promise<string> {
  if (wipeInFlight) await wipeInFlight;
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error('Unable to open files on this device.');
  }
  const dir = `${base}${SECURE_DIR_NAME}`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Already exists.
  }
  return dir;
}

/** A path in the private folder; the name is made filesystem-safe. */
export async function secureCachePath(name: string): Promise<string> {
  return `${await secureCacheDir()}${name.replace(/[^\w.-]+/g, '_')}`;
}

/**
 * Deletes every cached document and photo: our private folder plus anything else in the app cache
 * (older builds saved straight into it, and the image picker keeps copies of photos taken for upload).
 * Never throws: a failed wipe must not block logout or app start.
 */
export function wipeSecureCache(): Promise<void> {
  const base = FileSystem.cacheDirectory;
  if (!base) return Promise.resolve();
  const run = (async () => {
    try {
      const entries = await FileSystem.readDirectoryAsync(base);
      await Promise.all(
        entries.map((name) => FileSystem.deleteAsync(`${base}${name}`, { idempotent: true }).catch(() => undefined))
      );
    } catch {
      // Nothing to wipe.
    }
  })();
  wipeInFlight = run;
  void run.finally(() => {
    if (wipeInFlight === run) wipeInFlight = null;
  });
  return run;
}
