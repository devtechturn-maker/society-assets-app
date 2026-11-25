import { isValidPhone } from './PhoneInput';

/**
 * v23: checks a form before it is sent. Pass [label, value] pairs for required fields; returns a message such as
 * "Please fill in: Title, Date" or null when everything is filled. Empty strings and whitespace count as missing.
 */
export function missingMessage(required: [string, unknown][], options: { phones?: [string, string | null | undefined][] } = {}): string | null {
  const missing = required
    .filter(([, v]) => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))
    .map(([label]) => label);
  if (missing.length) {
    return `Please fill in: ${missing.join(', ')}`;
  }
  for (const [label, phone] of options.phones ?? []) {
    if (phone && phone.trim() && !isValidPhone(phone.trim())) {
      return `${label} must be a 10-digit mobile number`;
    }
  }
  return null;
}
