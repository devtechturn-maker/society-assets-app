import axios from 'axios';
import { API_BASE_URL } from '../config/env';

/** Extract a user-facing message from API / network errors. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;

    const noResponse = !error.response;
    const timedOut = error.code === 'ECONNABORTED';
    const network =
      noResponse &&
      (timedOut ||
        error.message === 'Network Error' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('network')));

    if (network) {
      return (
        'Cannot reach the API at ' +
        String(API_BASE_URL) +
        '.\n\n' +
        'On a real phone, set EXPO_PUBLIC_API_URL in .env to your PC LAN IP (same Wi-Fi as the PC), ' +
        'ensure Spring is running, and Windows Firewall allows inbound TCP on that port.'
      );
    }
    if (error.response) {
      return error.response.statusText || `Server error (${error.response.status})`;
    }
  }
  return error instanceof Error ? error.message : fallback;
}
