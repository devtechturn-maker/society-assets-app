let handler: (() => void) | null = null;

export function setMaintenanceSettingsRequiredHandler(next: (() => void) | null): void {
  handler = next;
}

export function notifyMaintenanceSettingsRequired(): void {
  handler?.();
}
