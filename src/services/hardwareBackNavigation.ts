/** Module-level handlers run before the shell navigates back to Home. */
type HardwareBackHandler = () => boolean;

const handlers = new Set<HardwareBackHandler>();

export function registerHardwareBackHandler(handler: HardwareBackHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function runHardwareBackHandlers(): boolean {
  for (const handler of [...handlers].reverse()) {
    if (handler()) {
      return true;
    }
  }
  return false;
}
