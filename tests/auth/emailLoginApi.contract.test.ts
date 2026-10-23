/**
 * Email login API contract tests: the app sends the normalized email to the email-OTP endpoints, and guards sign in
 * with phone + encrypted password.
 */
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

jest.mock('../../src/services/memberProfileNavigation', () => ({
  isEmailNotVerifiedError: jest.fn(() => false),
  requestMemberProfileNavigation: jest.fn(),
}));

jest.mock('../../src/crypto/rsaEncrypt', () => ({
  encryptPasswordForLogin: jest.fn((v: string) => `enc:${v}`),
}));

type Api = typeof import('../../src/services/api');

function apiOk<T>(data: T) {
  return { data: { message: 'OK', data, timestamp: new Date().toISOString() } };
}

const memberLogin = { token: 'jwt', role: 'MEMBER', societyId: 'society-1', userId: 'user-1' };

describe('email login API client', () => {
  beforeEach(() => {
    mockHttpClient.post.mockReset();
  });

  it('requests a code for the trimmed, lower-case email', async () => {
    const { requestEmailLoginOtp } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce(apiOk({ message: 'sent', expiresInMinutes: 10, resendAfterSeconds: 30 }));

    const result = await requestEmailLoginOtp('  Resident@Example.COM ');

    expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login/request-email-otp', {
      email: 'resident@example.com',
      clientType: 'MOBILE',
    });
    expect(result.resendAfterSeconds).toBe(30);
  });

  it('verifies the code and returns the signed-in account', async () => {
    const { verifyEmailLoginOtp } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce(apiOk({ ...memberLogin, selectionRequired: false }));

    const result = await verifyEmailLoginOtp('resident@example.com', ' 123456 ');

    expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login/verify-email-otp', {
      email: 'resident@example.com',
      otp: '123456',
      clientType: 'MOBILE',
    });
    expect(result).toMatchObject({ token: 'jwt', societyId: 'society-1' });
  });

  it('passes through onboarding and account choice without signing in', async () => {
    const { verifyEmailLoginOtp } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce(apiOk({ onboardingRequired: true, selectionToken: 'tok' }));
    expect(await verifyEmailLoginOtp('new@example.com', '123456')).toEqual({ onboardingRequired: true, selectionToken: 'tok' });

    mockHttpClient.post.mockResolvedValueOnce(apiOk({ selectionRequired: true, selectionToken: 'tok', accounts: [] }));
    expect(await verifyEmailLoginOtp('two@example.com', '123456')).toMatchObject({ selectionRequired: true });
  });

  it('completes sign-in with the chosen account', async () => {
    const { completeEmailLoginOtp } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce(apiOk(memberLogin));

    await completeEmailLoginOtp('Two@Example.com', ' tok ', { memberId: 'm-1', userId: 'user-1', societyId: 'society-1' });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login/complete-email-otp', {
      email: 'two@example.com',
      selectionToken: 'tok',
      memberId: 'm-1',
      userId: 'user-1',
      societyId: 'society-1',
      clientType: 'MOBILE',
    });
  });

  it('signs guards in with phone and an encrypted password', async () => {
    const { loginAsGuard } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValueOnce(apiOk({ ...memberLogin, role: 'GATEKEEPER' }));

    await loginAsGuard(' 9876543210 ', 'Gate@1234');

    expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/login/guard', {
      phone: '9876543210',
      encryptedPassword: 'enc:Gate@1234',
      clientType: 'MOBILE',
    });
  });

  it('sends the guard password encrypted when the chairman assigns or resets it', async () => {
    const { assignGateKeeper, resetGateKeeperPassword } = require('../../src/services/api') as Api;
    mockHttpClient.post.mockResolvedValue(apiOk({ id: 'gk-1' }));

    await assignGateKeeper({ name: 'Ramesh', phone: '9876543210', password: 'Gate@1234' });
    expect(mockHttpClient.post).toHaveBeenCalledWith('/society/gatekeeper/assign', {
      name: 'Ramesh',
      phone: '9876543210',
      encryptedPassword: 'enc:Gate@1234',
    });

    await resetGateKeeperPassword('gk-1', 'NewPass@99');
    expect(mockHttpClient.post).toHaveBeenCalledWith('/society/gatekeeper/gk-1/reset-password', {
      encryptedPassword: 'enc:NewPass@99',
    });
  });
});
