import type { MaintenancePaymentMethod } from '../types/api';

/** UPI bank reference (UTR / RRN): exactly 12 digits. */
const UPI_REFERENCE = /^\d{12}$/;

export function normalizeReference(reference: string): string {
  return reference.replace(/\s+/g, '');
}

/**
 * Same rules as the server: a 12-digit UPI reference is enough on its own; anything else needs a screenshot.
 * Empty strings mean no error.
 */
export function evidenceErrors(
  method: MaintenancePaymentMethod,
  reference: string,
  hasPhoto: boolean
): { reference: string; photo: string } {
  const ref = normalizeReference(reference);
  if (hasPhoto) {
    return { reference: ref.length < 4 ? 'Enter the transaction / UTR reference number.' : '', photo: '' };
  }
  if (method !== 'UPI') {
    return {
      reference: ref.length < 4 ? 'Enter the transaction / UTR reference number.' : '',
      photo: 'A screenshot of the payment is required.',
    };
  }
  if (UPI_REFERENCE.test(ref)) {
    return { reference: '', photo: '' };
  }
  return {
    reference: 'Enter the 12-digit UPI reference number (UTR), or add a screenshot below.',
    photo: '',
  };
}
