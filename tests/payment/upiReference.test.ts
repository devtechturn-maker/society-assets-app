/** v20: UPI reference (UTR) instead of a screenshot. */
import { mockHttpClient } from '../utils/httpMockClient';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const { mockHttpClient: client } = require('../utils/httpMockClient');
  return {
    ...actual,
    create: jest.fn(() => client),
    isAxiosError: actual.isAxiosError,
  };
});

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../../src/services/storage', () => ({
  getToken: jest.fn(async () => null),
  clearSession: jest.fn(async () => undefined),
}));

jest.mock('../../src/services/session', () => ({
  notifySessionInvalid: jest.fn(),
}));

jest.mock('../../src/services/globalApiLoading', () => ({
  attachGlobalLoadingInterceptors: jest.fn(),
}));


import { evidenceErrors, normalizeReference } from '../../src/utils/paymentEvidence';

type Api = typeof import('../../src/services/api');

describe('payment evidence rules', () => {
  it('accepts a 12-digit UPI reference without a screenshot, ignoring spaces', () => {
    expect(evidenceErrors('UPI', '4312 9876 5432', false)).toEqual({ reference: '', photo: '' });
    expect(normalizeReference(' 4312 9876 5432 ')).toBe('431298765432');
  });

  it('asks for the 12-digit UTR or a screenshot when the UPI reference is not 12 digits', () => {
    for (const ref of ['43129876543', '4312987654321', 'T2311221234567', '']) {
      expect(evidenceErrors('UPI', ref, false).reference).toContain('12-digit');
    }
  });

  it('still needs a screenshot for bank transfer, cheque and other methods', () => {
    expect(evidenceErrors('BANK_TRANSFER', '431298765432', false).photo).toContain('screenshot');
    expect(evidenceErrors('CHEQUE', '000123', true)).toEqual({ reference: '', photo: '' });
  });

  it('with a screenshot, keeps accepting other reference formats', () => {
    expect(evidenceErrors('UPI', 'T2311221234567', true)).toEqual({ reference: '', photo: '' });
  });
});

describe('submit without a screenshot', () => {
  it('sends no screenshot part', async () => {
    const { submitMaintenancePayment } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce({ data: { message: 'OK', data: { id: 'p1' } } });
    const appended: string[] = [];
    const original = FormData.prototype.append;
    FormData.prototype.append = function (this: FormData, name: string, ...rest: unknown[]) {
      appended.push(name);
      return (original as (...a: unknown[]) => void).call(this, name, ...rest);
    } as typeof FormData.prototype.append;
    try {
      await submitMaintenancePayment({ paymentMethod: 'UPI', referenceNo: '431298765432', paidOn: '2026-11-23' });
    } finally {
      FormData.prototype.append = original;
    }
    expect(appended).toEqual(['paymentMethod', 'referenceNo', 'paidOn']);
    expect(mockHttpClient.post).toHaveBeenCalledWith('/member/maintenance/payments', expect.anything(), expect.anything());
  });
});
