import type { InternalAxiosRequestConfig } from 'axios';

type LoadingListener = (visible: boolean, message: string) => void;

/** Avoid flicker on very fast API calls. */
const API_SHOW_DELAY_MS = 280;
const HIDE_DELAY_MS = 150;

let pendingCount = 0;
let blockingTaskCount = 0;
let blockingTaskMessage = 'Loading...';
let overlayVisible = false;

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<LoadingListener>();

const SILENT_URL_PARTS = ['/notifications/unread-count'];

function shouldTrack(config?: InternalAxiosRequestConfig): boolean {
  if (!config) {
    return false;
  }
  const headers = config.headers as Record<string, unknown> | undefined;
  if (headers?.['X-Skip-Global-Loader'] === '1') {
    return false;
  }
  const url = `${config.url ?? ''}`;
  return !SILENT_URL_PARTS.some((part) => url.includes(part));
}

function currentMessage(): string {
  return blockingTaskCount > 0 ? blockingTaskMessage : 'Loading...';
}

function wantsOverlay(): boolean {
  return pendingCount > 0 || blockingTaskCount > 0;
}

function notify() {
  listeners.forEach((listener) => listener(overlayVisible, currentMessage()));
}

function clearShowTimer() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleOverlay() {
  if (wantsOverlay()) {
    clearHideTimer();

    if (overlayVisible) {
      notify();
      return;
    }

    // Post-API navigation / sign-out — show immediately.
    if (blockingTaskCount > 0) {
      clearShowTimer();
      overlayVisible = true;
      notify();
      return;
    }

    // API in flight — brief delay to skip flicker on fast responses.
    if (showTimer) {
      return;
    }
    showTimer = setTimeout(() => {
      showTimer = null;
      if (wantsOverlay()) {
        overlayVisible = true;
        notify();
      }
    }, API_SHOW_DELAY_MS);
    return;
  }

  clearShowTimer();
  if (!overlayVisible) {
    return;
  }
  if (hideTimer) {
    return;
  }
  hideTimer = setTimeout(() => {
    hideTimer = null;
    overlayVisible = false;
    notify();
  }, HIDE_DELAY_MS);
}

export function trackApiRequestStart(config: InternalAxiosRequestConfig): void {
  if (!shouldTrack(config)) {
    return;
  }
  pendingCount += 1;
  scheduleOverlay();
}

export function trackApiRequestEnd(config?: InternalAxiosRequestConfig): void {
  if (!shouldTrack(config)) {
    return;
  }
  pendingCount = Math.max(0, pendingCount - 1);
  scheduleOverlay();
}

/**
 * Keep the loader visible until async work finishes (e.g. save session + navigate).
 * Use for steps after an API returns — axios interceptors only cover in-flight requests.
 */
export async function withBlockingLoader<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  blockingTaskCount += 1;
  blockingTaskMessage = message;
  scheduleOverlay();
  try {
    return await fn();
  } finally {
    blockingTaskCount = Math.max(0, blockingTaskCount - 1);
    scheduleOverlay();
  }
}

/** @deprecated Prefer withBlockingLoader — clears immediately when work is done. */
export function setBlockingMessage(message: string | null): void {
  if (message !== null) {
    blockingTaskCount += 1;
    blockingTaskMessage = message;
  } else {
    blockingTaskCount = Math.max(0, blockingTaskCount - 1);
  }
  scheduleOverlay();
}

export function subscribeGlobalLoading(listener: LoadingListener): () => void {
  listeners.add(listener);
  listener(overlayVisible, currentMessage());
  return () => listeners.delete(listener);
}

export function attachGlobalLoadingInterceptors(axiosInstance: {
  interceptors: {
    request: {
      use: (
        onFulfilled: (
          config: InternalAxiosRequestConfig
        ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
      ) => void;
    };
    response: {
      use: (
        onFulfilled: (response: { config: InternalAxiosRequestConfig }) => unknown,
        onRejected: (error: { config?: InternalAxiosRequestConfig }) => unknown
      ) => void;
    };
  };
}): void {
  axiosInstance.interceptors.request.use((config) => {
    trackApiRequestStart(config);
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      trackApiRequestEnd(response.config);
      return response;
    },
    (error) => {
      trackApiRequestEnd(error.config);
      return Promise.reject(error);
    }
  );
}
