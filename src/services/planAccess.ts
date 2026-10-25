import { useSyncExternalStore } from 'react';
import { fetchPlanAccess } from './api';

/** What the society's plan includes: locked screens (route path -> plan that unlocks it). Loaded with the menu. */
export type PlanAccess = {
  planName: string | null;
  allFeatures: boolean;
  features: string[];
  lockedRoutes: Record<string, string>;
};

const OPEN: PlanAccess = { planName: null, allFeatures: true, features: [], lockedRoutes: {} };

let current: PlanAccess = OPEN;
const listeners = new Set<() => void>();

function publish(next: PlanAccess) {
  current = next;
  listeners.forEach((l) => l());
}

/** Refreshes the plan's features; on any error the app stays open and the server still enforces the plan. */
export async function loadPlanAccess(): Promise<void> {
  try {
    publish({ ...OPEN, ...(await fetchPlanAccess()) });
  } catch {
    publish(OPEN);
  }
}

export function resetPlanAccess(): void {
  publish(OPEN);
}

export function usePlanAccess(): PlanAccess {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
}

/** Null when the screen is part of the plan; otherwise the plan that unlocks it ('' when none does). */
export function lockedBy(access: PlanAccess, route: string): string | null {
  return route in access.lockedRoutes ? access.lockedRoutes[route] : null;
}
