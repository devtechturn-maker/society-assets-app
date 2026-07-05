import type { InternalAxiosRequestConfig } from 'axios';

type LoadingListener = (visible: boolean, message: string) => void;

const SHOW_DELAY_MS = 280;
const HIDE_DELAY_MS = 150;

let pendingCount = 0;
let manualMessage: string | null = null;
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
  return manualMessage ?? 'Loading…';
}

function notify() {
  const message = currentMessage();
  listeners.forEach((listener) => listener(overlayVisible, message));
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
  const wantsOverlay = pendingCount > 0 || manualMessage !== null;

  if (wantsOverlay) {
    clearHideTimer();
    if (manualMessage !== null) {
      clearShowTimer();
      if (!overlayVisible) {
        overlayVisible = true;
      }
      notify();
      return;
    }
    if (overlayVisible) {
      notify();
      return;
    }
    if (showTimer) {
      return;
    }
    showTimer = setTimeout(() => {
      showTimer = null;
      overlayVisible = true;
      notify();
    }, SHOW_DELAY_MS);
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

/** Block the UI for actions that are not a single axios call (e.g. sign out). */
export function setBlockingMessage(message: string | null): void {
  manualMessage = message;
  scheduleOverlay();
}

export function subscribeGlobalLoading(listener: LoadingListener): () => void {
  listeners.add(listener);
  listener(overlayVisible, currentMessage());
  return () => listeners.delete(listener);
}

export function attachGlobalLoadingInterceptors(axiosInstance: {
  interceptors: {
    request: { use: (onFulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>) => void };
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
