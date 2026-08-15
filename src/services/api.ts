import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../config/env';
import { clearSession, getToken } from './storage';
import { notifySessionInvalid } from './session';
import type {
  ApiResponse,
  ExpenseCategoryReportRow,
  FlatNumberFormat,
  LoginData,
  LoginAccountOption,
  OnboardingOpenFlat,
  OnboardingSocietyOption,
  SmsLoginVerifyResult,
  MaintenanceSettings,
  MonthlyMaintenanceReportRow,
  NavModule,
  PaymentModeReport,
  PendingMaintenanceMember,
  RecentExpense,
  ReportSummary,
  SocietyContractRow,
  SocietyContractTypeOption,
  MemberUploadResult,
  MemberExcelValidation,
  SocietyMember,
  DirectoryEntry,
  MemberVehicleRecord,
  FamilyMemberPayload,
  VehiclePayload,
  MemberFamilyMember,
  SocietySubscriptionStatus,
  PublicSubscriptionPlan,
  UpgradeQuote,
  AdditionalMembersQuote,
  UpdateMemberPayload,
  ReportEmailPayload,
  ReportEmailResult,
  ReportDownloadPayload,
  SocietyOverview,
  SocietyMemberPaymentSettings,
  MemberOverview,
  MemberMaintenanceDue,
  MemberMaintenanceCheckout,
  MemberMaintenanceVerifyResult,
  MemberProfile,
  ChatThread,
  ChatThreadQuery,
  ChatMessage,
  ChatGroupSummary,
  PollDetail,
  PollSummary,
  ComplaintDetail,
  ComplaintSummary,
  AppNotification,
  NotificationPage,
  VisitorSummary,
  VisitorDetail,
  VisitorHistoryPage,
  GateKeeperDashboard,
  ChairmanVisitorDashboard,
  GateKeeperAssignment,
  ResidentSearchResult,
} from '../types/api';
import type { NotificationAudience } from '../utils/notificationAudience';
import { encryptPasswordForLogin } from '../crypto/rsaEncrypt';
import { attachGlobalLoadingInterceptors } from './globalApiLoading';
import { isEmailNotVerifiedError, requestMemberProfileNavigation } from './memberProfileNavigation';

/** Identifies society mobile app to the API (long-lived JWT on login). */
export const MOBILE_CLIENT_TYPE = 'MOBILE';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': MOBILE_CLIENT_TYPE,
  },
});

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': MOBILE_CLIENT_TYPE,
  },
});

attachGlobalLoadingInterceptors(client);
attachGlobalLoadingInterceptors(publicClient);

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        const url = error.config?.url ?? '';
        if (!url.includes('/auth/login')) {
          await clearSession();
          notifySessionInvalid();
        }
      } else if (isEmailNotVerifiedError(error)) {
        requestMemberProfileNavigation();
      }
    }
    return Promise.reject(error);
  }
);

const SOCIETY_STAFF_ROLES = new Set(['CHAIRMAN', 'TREASURER', 'USER', 'AUDITOR']);
const SOCIETY_APP_ROLES = new Set([...SOCIETY_STAFF_ROLES, 'MEMBER', 'GATEKEEPER']);

export function isSocietyStaffRole(role: string): boolean {
  return SOCIETY_STAFF_ROLES.has((role ?? '').toUpperCase());
}

export function isMemberRole(role: string): boolean {
  return (role ?? '').toUpperCase() === 'MEMBER';
}

export function isGateKeeperRole(role: string): boolean {
  return (role ?? '').toUpperCase() === 'GATEKEEPER';
}

export function isTreasurerRole(role: string): boolean {
  return (role ?? '').toUpperCase() === 'TREASURER';
}

/** Society staff or flat member — both use the mobile app. */
export function isSocietyRole(role: string): boolean {
  return SOCIETY_APP_ROLES.has((role ?? '').toUpperCase());
}

async function getData<T>(
  url: string,
  options?: { skipGlobalLoader?: boolean; timeoutMs?: number }
): Promise<T> {
  const { data } = await client.get<ApiResponse<T>>(url, {
    timeout: options?.timeoutMs,
    headers: options?.skipGlobalLoader ? { 'X-Skip-Global-Loader': '1' } : undefined,
  });
  return data.data;
}

/** Public catalog — no auth required. */
export async function fetchPublicPlans(): Promise<PublicSubscriptionPlan[]> {
  const { data } = await publicClient.get<ApiResponse<PublicSubscriptionPlan[]>>('/subscription-plans');
  return (data.data ?? []).filter((p) => p.active);
}

function assertMobileLoginData(payload: LoginData): LoginData {
  const role = (payload.role ?? '').toUpperCase();
  if (role === 'PRODUCT_OWNER') {
    throw new Error('This account type cannot sign in on the mobile app.');
  }
  if (!isSocietyRole(role)) {
    throw new Error('This account cannot sign in. Contact your society office for help.');
  }
  if (!payload.societyId) {
    throw new Error('No society linked to this account.');
  }
  return payload;
}

export async function requestSmsLoginOtp(
  phone: string
): Promise<{ message: string; expiresInMinutes: number; sandbox?: boolean; sandboxOtp?: string }> {
  const { data } = await client.post<
    ApiResponse<{ message: string; expiresInMinutes: number; sandbox?: boolean; sandboxOtp?: string }>
  >('/auth/login/request-sms-otp', { phone: phone.trim(), clientType: MOBILE_CLIENT_TYPE });
  return data.data;
}

export async function verifySmsLoginOtp(phone: string, otp: string): Promise<SmsLoginVerifyResult> {
  const { data } = await client.post<ApiResponse<SmsLoginVerifyResult>>('/auth/login/verify-sms-otp', {
    phone: phone.trim(),
    otp: otp.trim(),
    clientType: MOBILE_CLIENT_TYPE,
  });
  const payload = data.data;
  if (payload.onboardingRequired || payload.selectionRequired) {
    return payload;
  }
  return assertMobileLoginData(payload as LoginData);
}

export async function completeSmsLoginOtp(
  phone: string,
  selectionToken: string,
  account: Pick<LoginAccountOption, 'memberId' | 'userId' | 'societyId'>
): Promise<LoginData> {
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/login/complete-sms-otp', {
    phone: phone.trim(),
    selectionToken: selectionToken.trim(),
    memberId: account.memberId,
    userId: account.userId,
    societyId: account.societyId,
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

export async function previewFlatNumbers(payload: {
  totalFlats: number;
  totalBuildings: number;
  flatNumberFormat: FlatNumberFormat;
  flatsPerFloor?: number;
}): Promise<{ total: number; flatNumbers: string[] }> {
  const { data } = await client.post<ApiResponse<{ total: number; flatNumbers: string[] }>>(
    '/auth/onboarding/preview-flats',
    payload
  );
  return data.data;
}

export async function searchOnboardingSocieties(query: string): Promise<OnboardingSocietyOption[]> {
  const { data } = await client.get<ApiResponse<OnboardingSocietyOption[]>>('/auth/onboarding/societies', {
    params: { q: query.trim() },
  });
  return data.data ?? [];
}

export async function lookupOnboardingJoinCode(code: string): Promise<OnboardingSocietyOption & { joinCode: string }> {
  const normalized = code.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const { data } = await client.get<ApiResponse<OnboardingSocietyOption & { joinCode: string }>>(
    `/auth/onboarding/join-code/${encodeURIComponent(normalized)}`
  );
  return data.data;
}

export async function listOnboardingOpenFlats(societyId: string): Promise<OnboardingOpenFlat[]> {
  const { data } = await client.get<ApiResponse<OnboardingOpenFlat[]>>(
    `/auth/onboarding/societies/${societyId}/open-flats`
  );
  return data.data ?? [];
}

export async function createSocietyMobile(payload: {
  phone: string;
  selectionToken: string;
  societyName: string;
  totalFlats: number;
  totalBuildings: number;
  flatNumberFormat: FlatNumberFormat;
  flatsPerFloor?: number;
  chairmanName: string;
  email: string;
  societyAddress?: string;
}): Promise<LoginData> {
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/onboarding/create-society', {
    ...payload,
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

export async function joinSocietyMobile(payload: {
  phone: string;
  selectionToken: string;
  societyId: string;
  memberId: string;
  memberName: string;
}): Promise<LoginData> {
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/onboarding/join-society', {
    ...payload,
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

export async function fetchClaimableFlats(): Promise<OnboardingOpenFlat[]> {
  const { data } = await client.get<ApiResponse<OnboardingOpenFlat[]>>('/society/members/claimable-flats');
  return data.data ?? [];
}

export async function linkMemberFlat(memberId: string): Promise<LoginData['memberProfile']> {
  const { data } = await client.post<ApiResponse<LoginData['memberProfile']>>('/society/members/link-flat', {
    memberId,
  });
  return data.data;
}

export async function refreshLoginSession(): Promise<LoginData> {
  const { data } = await client.get<ApiResponse<LoginData>>('/auth/session');
  return assertMobileLoginData(data.data);
}

export async function createAdditionalSocietyMobile(payload: {
  societyName: string;
  totalFlats: number;
  totalBuildings: number;
  flatNumberFormat: FlatNumberFormat;
  flatsPerFloor?: number;
  chairmanName: string;
  email: string;
  societyAddress?: string;
}): Promise<LoginData> {
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/society/create-additional', {
    ...payload,
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

export async function requestLoginOtp(email: string): Promise<{ message: string; expiresInMinutes: number }> {
  const { data } = await client.post<ApiResponse<{ message: string; expiresInMinutes: number }>>(
    '/auth/login/request-otp',
    { email: email.trim().toLowerCase(), clientType: MOBILE_CLIENT_TYPE }
  );
  return data.data;
}

export async function verifyLoginOtp(email: string, otp: string): Promise<LoginData> {
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/login/verify-otp', {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

/** @deprecated Use requestLoginOtp + verifyLoginOtp */
export async function login(email: string, password: string): Promise<LoginData> {
  const encryptedPassword = encryptPasswordForLogin(password);
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/login', {
    email: email.trim().toLowerCase(),
    encryptedPassword,
    clientType: MOBILE_CLIENT_TYPE,
  });
  return assertMobileLoginData(data.data);
}

export const fetchSocietyModules = () => getData<NavModule[]>('/modules/society');
export const fetchTreasurerModules = () => getData<NavModule[]>('/modules/treasurer');
export const fetchMemberModules = () => getData<NavModule[]>('/modules/member');
export const fetchGatekeeperModules = () => getData<NavModule[]>('/modules/gatekeeper');
export const fetchOverview = () => getData<SocietyOverview>('/society/dashboard/overview');
export const fetchMemberOverview = () => getData<MemberOverview>('/member/overview');
export const fetchMemberMaintenanceDue = () => getData<MemberMaintenanceDue>('/member/maintenance/due');
export const fetchMemberMaintenanceHistory = () =>
  getData<RecentExpense[]>('/member/maintenance');

export async function createMemberMaintenanceCheckout(): Promise<MemberMaintenanceCheckout> {
  const { data } = await client.post<ApiResponse<MemberMaintenanceCheckout>>('/member/maintenance/checkout');
  return data.data;
}

export async function verifyMemberMaintenancePayment(payload: {
  paymentId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}): Promise<MemberMaintenanceVerifyResult> {
  const { data } = await client.post<ApiResponse<MemberMaintenanceVerifyResult>>(
    '/member/maintenance/verify',
    payload
  );
  return data.data;
}

export async function downloadMemberMaintenanceReceipt(expenseId: string): Promise<string> {
  const token = await getToken();
  const url = `${API_BASE_URL}/member/maintenance/${expenseId}/receipt`;
  const filename = `maintenance-receipt-${expenseId}.pdf`;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Unable to save receipt on this device.');
  }
  const fileUri = `${cacheDir}${filename}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Type': MOBILE_CLIENT_TYPE,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error('Unable to download receipt. Please try again.');
  }

  return result.uri;
}

export async function changeFirstLoginPassword(newPassword: string): Promise<void> {
  const encryptedNewPassword = encryptPasswordForLogin(newPassword);
  await client.post<ApiResponse<{ message: string }>>('/auth/first-login/change-password', {
    encryptedNewPassword,
  });
}

export async function requestPasswordResetOtp(email: string): Promise<{ message: string; expiresInMinutes: number }> {
  const { data } = await publicClient.post<ApiResponse<{ message: string; expiresInMinutes: number }>>(
    '/auth/forgot-password/request-otp',
    { email: email.trim().toLowerCase() }
  );
  return data.data;
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<{ message: string; resetToken: string }> {
  const { data } = await publicClient.post<ApiResponse<{ message: string; resetToken: string }>>(
    '/auth/forgot-password/verify-otp',
    { email: email.trim().toLowerCase(), otp: otp.trim() }
  );
  return data.data;
}

export async function resetPasswordWithToken(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<void> {
  const encryptedNewPassword = encryptPasswordForLogin(newPassword);
  await publicClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password/reset', {
    email: email.trim().toLowerCase(),
    resetToken,
    encryptedNewPassword,
  });
}

export async function confirmChangePassword(resetToken: string, newPassword: string): Promise<void> {
  const encryptedNewPassword = encryptPasswordForLogin(newPassword);
  await client.post<ApiResponse<{ message: string }>>('/auth/change-password/confirm', {
    resetToken,
    encryptedNewPassword,
  });
}

export async function requestChangePasswordOtp(): Promise<{
  message: string;
  expiresInMinutes: number;
  email: string;
}> {
  const { data } = await client.post<ApiResponse<{ message: string; expiresInMinutes: number; email: string }>>(
    '/auth/change-password/request-otp',
    {}
  );
  return data.data;
}

export async function verifyChangePasswordOtp(
  otp: string
): Promise<{ message: string; resetToken: string }> {
  const { data } = await client.post<ApiResponse<{ message: string; resetToken: string }>>(
    '/auth/change-password/verify-otp',
    { otp: otp.trim() }
  );
  return data.data;
}

export const fetchRecentExpenses = () => getData<RecentExpense[]>('/society/dashboard/recent-expenses');
export const fetchExpenseHistory = () => getData<RecentExpense[]>('/expenses');
export const fetchMaintenanceHistory = () => getData<RecentExpense[]>('/expenses/maintenance');
export const fetchLedgerHistory = () => getData<RecentExpense[]>('/expenses/ledger');
export const fetchMaintenancePending = () =>
  getData<PendingMaintenanceMember[]>('/expenses/maintenance/pending');
export const fetchMembers = () => getData<SocietyMember[]>('/society/members');
export const fetchRegisteredMembers = () => getData<SocietyMember[]>('/society/members/registered');
export const fetchSocietyJoinCode = () =>
  getData<{ societyId: string; societyName: string; joinCode: string }>('/society/join-code');
export const fetchMemberDirectory = () => getData<DirectoryEntry[]>('/member/directory');

export const fetchMemberFamilyMembers = () =>
  getData<MemberFamilyMember[]>('/member/family-members');

export async function createMemberFamilyMember(payload: FamilyMemberPayload): Promise<MemberFamilyMember> {
  const { data } = await client.post<ApiResponse<MemberFamilyMember>>('/member/family-members', payload);
  return data.data;
}

export async function updateMemberFamilyMember(
  id: string,
  payload: FamilyMemberPayload
): Promise<MemberFamilyMember> {
  const { data } = await client.put<ApiResponse<MemberFamilyMember>>(`/member/family-members/${id}`, payload);
  return data.data;
}

export async function deleteMemberFamilyMember(id: string): Promise<void> {
  await client.delete(`/member/family-members/${id}`);
}

export const fetchMemberVehicles = () => getData<MemberVehicleRecord[]>('/member/vehicles');

export async function createMemberVehicle(payload: VehiclePayload): Promise<MemberVehicleRecord> {
  const { data } = await client.post<ApiResponse<MemberVehicleRecord>>('/member/vehicles', payload);
  return data.data;
}

export async function updateMemberVehicle(id: string, payload: VehiclePayload): Promise<MemberVehicleRecord> {
  const { data } = await client.put<ApiResponse<MemberVehicleRecord>>(`/member/vehicles/${id}`, payload);
  return data.data;
}

export async function deleteMemberVehicle(id: string): Promise<void> {
  await client.delete(`/member/vehicles/${id}`);
}

export const fetchSubscriptionStatus = (options?: {
  skipGlobalLoader?: boolean;
  timeoutMs?: number;
}) => getData<SocietySubscriptionStatus>('/society/subscription/status', options);

export async function createDurationPlanCheckout(months: number): Promise<{
  societyId: string;
  months: number;
  flatCount: number;
  pricePerFlat: number;
  amount: number;
  payment: {
    required?: boolean;
    activated?: boolean;
    status?: string;
    amountInr?: number;
    keyId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    planName?: string;
  };
}> {
  const { data } = await client.post<
    ApiResponse<{
      societyId: string;
      months: number;
      flatCount: number;
      pricePerFlat: number;
      amount: number;
      payment: {
        required?: boolean;
        activated?: boolean;
        status?: string;
        amountInr?: number;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        planName?: string;
      };
    }>
  >('/society/subscription/duration/checkout', { months });
  return data.data;
}

export async function verifySubscriptionPayment(payload: {
  societyId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ status: string; validUntil?: string; planName?: string }> {
  const { data } = await client.post<
    ApiResponse<{ status: string; validUntil?: string; planName?: string }>
  >('/payments/verify', payload);
  return data.data;
}

export const fetchSocietySubscriptionPlans = () =>
  getData<PublicSubscriptionPlan[]>('/society/subscription/plans');

export async function quoteSubscriptionUpgrade(
  planId: string,
  targetAdditionalMemberSlots?: number
): Promise<UpgradeQuote> {
  const { data } = await client.post<ApiResponse<UpgradeQuote>>('/society/subscription/upgrade/quote', {
    planId,
    targetAdditionalMemberSlots: targetAdditionalMemberSlots ?? null,
  });
  return data.data;
}

export async function quoteAdditionalMembers(count: number): Promise<AdditionalMembersQuote> {
  const { data } = await client.post<ApiResponse<AdditionalMembersQuote>>(
    '/society/subscription/additional-members/quote',
    { count }
  );
  return data.data;
}

export interface AddMemberPayload {
  name: string;
  email: string;
  flatNumber: string;
  phone: string;
  customMaintenanceAmount: number | null;
}

export async function addMember(payload: AddMemberPayload): Promise<SocietyMember> {
  const { data } = await client.post<ApiResponse<SocietyMember>>('/society/members', payload);
  return data.data;
}

export async function validateMembersExcel(
  fileUri: string,
  fileName: string,
  mimeType: string | null
): Promise<MemberExcelValidation> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as unknown as Blob);

  const { data } = await client.post<ApiResponse<MemberExcelValidation>>(
    '/society/members/validate-excel',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }
  );
  return data.data;
}

export async function uploadMembersExcel(
  fileUri: string,
  fileName: string,
  mimeType: string | null
): Promise<MemberUploadResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as unknown as Blob);

  const { data } = await client.post<ApiResponse<MemberUploadResult>>(
    '/society/members/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }
  );
  return data.data;
}

export async function updateMember(id: string, payload: UpdateMemberPayload): Promise<SocietyMember> {
  const { data } = await client.put<ApiResponse<SocietyMember>>(`/society/members/${id}`, payload);
  return data.data;
}
export const fetchContracts = () => getData<SocietyContractRow[]>('/society/contracts');

export interface CreateContractPayload {
  contractType: string;
  vendorName: string | null;
  referenceNote: string | null;
  startDate: string;
  endDate: string;
  contractValue: number | null;
}

export async function createContract(payload: CreateContractPayload): Promise<SocietyContractRow> {
  const { data } = await client.post<ApiResponse<SocietyContractRow>>('/society/contracts', payload);
  return data.data;
}
export const fetchMaintenanceSettings = () =>
  getData<MaintenanceSettings>('/society/settings/maintenance');

export async function updateMaintenanceSettings(
  payload: MaintenanceSettings
): Promise<MaintenanceSettings> {
  const { data } = await client.put<ApiResponse<MaintenanceSettings>>(
    '/society/settings/maintenance',
    payload
  );
  return data.data;
}

export const fetchMemberPaymentSettings = () =>
  getData<SocietyMemberPaymentSettings>('/society/settings/member-payments');

export async function updateMemberPaymentSettings(
  payload: Record<string, unknown>
): Promise<SocietyMemberPaymentSettings> {
  const { data } = await client.put<ApiResponse<SocietyMemberPaymentSettings>>(
    '/society/settings/member-payments',
    payload
  );
  return data.data;
}

export async function requestMemberPaymentSetupOtp(payload: Record<string, unknown>): Promise<{
  message: string;
  email: string;
  expiresInMinutes: number;
}> {
  const { data } = await client.post<
    ApiResponse<{ message: string; email: string; expiresInMinutes: number }>
  >('/society/settings/member-payments/request-setup-otp', payload);
  return data.data;
}

export async function verifyMemberPaymentSetupOtp(otp: string): Promise<SocietyMemberPaymentSettings> {
  const { data } = await client.post<ApiResponse<SocietyMemberPaymentSettings>>(
    '/society/settings/member-payments/verify-setup-otp',
    { otp }
  );
  return data.data;
}

export const fetchContractTypes = () =>
  getData<SocietyContractTypeOption[]>('/society/settings/contract-types');

export async function addContractType(payload: {
  label: string;
  code?: string | null;
}): Promise<SocietyContractTypeOption> {
  const { data } = await client.post<ApiResponse<SocietyContractTypeOption>>(
    '/society/settings/contract-types',
    { label: payload.label, code: payload.code ?? null }
  );
  return data.data;
}

export async function deleteContractType(id: string): Promise<void> {
  await client.delete<ApiResponse<null>>(`/society/settings/contract-types/${id}`);
}
export const fetchReportSummary = () => getData<ReportSummary>('/society/dashboard/reports/summary');
export const fetchReportMonthlyMaintenance = () =>
  getData<MonthlyMaintenanceReportRow[]>('/society/dashboard/reports/monthly-maintenance');
export const fetchReportExpenseCategories = () =>
  getData<ExpenseCategoryReportRow[]>('/society/dashboard/reports/expense-categories');
export const fetchReportPaymentModes = () =>
  getData<PaymentModeReport>('/society/dashboard/reports/payment-modes');
export const fetchReportMemberPending = () =>
  getData<PendingMaintenanceMember[]>('/society/dashboard/reports/member-pending');

export async function sendPendingReminder(memberId: string): Promise<void> {
  await client.post<ApiResponse<null>>('/expenses/maintenance/pending/reminder', { memberId });
}

export type PaymentType = 'CASH' | 'ONLINE';

export interface AddMaintenancePayload {
  memberId: string;
  amount: number;
  description: string;
  expenseDate: string | null;
  paymentType: PaymentType;
  maintenanceFromMonth: string;
  maintenanceToMonth: string | null;
}

export interface AddExpensePayload {
  category: string;
  amount: number;
  description: string;
  expenseDate: string | null;
  paymentType: PaymentType;
}

export async function addExpense(payload: AddExpensePayload): Promise<void> {
  await client.post<ApiResponse<null>>('/expenses', {
    category: payload.category,
    amount: payload.amount,
    description: payload.description,
    expenseDate: payload.expenseDate,
    paymentType: payload.paymentType,
  });
}

export interface AddOtherIncomePayload {
  category: string;
  flatNumber: string | null;
  amount: number;
  description: string;
  expenseDate: string | null;
  paymentType: PaymentType;
}

export async function addOtherIncome(payload: AddOtherIncomePayload): Promise<void> {
  await client.post<ApiResponse<null>>('/expenses/income', {
    category: payload.category,
    flatNumber: payload.flatNumber,
    amount: payload.amount,
    description: payload.description,
    expenseDate: payload.expenseDate,
    paymentType: payload.paymentType,
  });
}

export async function addMaintenance(payload: AddMaintenancePayload): Promise<void> {
  await client.post<ApiResponse<null>>('/expenses/maintenance', {
    memberId: payload.memberId,
    amount: payload.amount,
    description: payload.description,
    expenseDate: payload.expenseDate,
    paymentType: payload.paymentType,
    maintenanceFromMonth: payload.maintenanceFromMonth,
    maintenanceToMonth: payload.maintenanceToMonth,
  });
}

export async function sendReportsEmail(payload: ReportEmailPayload): Promise<ReportEmailResult> {
  const { data } = await client.post<ApiResponse<ReportEmailResult>>(
    '/society/dashboard/reports/email',
    payload
  );
  return data.data;
}

export async function downloadReportsToDevice(
  payload: ReportDownloadPayload
): Promise<{ uri: string; filename: string; mimeType: string }> {
  const response = await client.post<ArrayBuffer>('/society/dashboard/reports/download', payload, {
    responseType: 'arraybuffer',
  });
  const disposition = response.headers['content-disposition'];
  const filename =
    parseContentDispositionFilename(typeof disposition === 'string' ? disposition : null) ??
    'society-reports.zip';
  const mimeType =
    typeof response.headers['content-type'] === 'string'
      ? response.headers['content-type']
      : filename.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/zip';
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Unable to save reports on this device.');
  }
  const fileUri = `${cacheDir}${filename}`;
  const base64 = uint8ArrayToBase64(new Uint8Array(response.data));
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: fileUri, filename, mimeType };
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() ?? null;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function fetchChatGroups(memberPortal: boolean): Promise<ChatGroupSummary[]> {
  const url = memberPortal ? '/member/chat/groups' : '/society/chat/groups';
  return getData<ChatGroupSummary[]>(url);
}

export const CHAT_MESSAGE_PAGE_SIZE = 25;

export function fetchGroupChatThread(
  memberPortal: boolean,
  groupId: string,
  query: ChatThreadQuery = {}
): Promise<ChatThread> {
  const params = new URLSearchParams();
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.before) params.set('before', query.before);
  if (query.after) params.set('after', query.after);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const url = memberPortal
    ? `/member/chat/groups/${groupId}${suffix}`
    : `/society/chat/groups/${groupId}${suffix}`;
  return getData<ChatThread>(url);
}

export async function createChatGroup(name: string, memberIds: string[]): Promise<ChatGroupSummary> {
  const { data } = await client.post<ApiResponse<ChatGroupSummary>>('/society/chat/groups', {
    name,
    memberIds,
  });
  return data.data;
}

export function fetchChatGroupMembers(groupId: string): Promise<SocietyMember[]> {
  return getData<SocietyMember[]>(`/society/chat/groups/${groupId}/members`);
}

export async function addChatGroupMembers(
  groupId: string,
  memberIds: string[]
): Promise<ChatGroupSummary> {
  const { data } = await client.post<ApiResponse<ChatGroupSummary>>(
    `/society/chat/groups/${groupId}/members`,
    { memberIds }
  );
  return data.data;
}

export async function sendGroupChatMessage(
  memberPortal: boolean,
  groupId: string,
  body: string
): Promise<ChatMessage> {
  const url = memberPortal
    ? `/member/chat/groups/${groupId}/messages`
    : `/society/chat/groups/${groupId}/messages`;
  const { data } = await client.post<ApiResponse<ChatMessage>>(url, { body });
  return data.data;
}

export async function sendGroupChatMessageWithPhoto(
  memberPortal: boolean,
  groupId: string,
  body: string,
  photoUri: string,
  fileName: string,
  mimeType: string
): Promise<ChatMessage> {
  const url = memberPortal
    ? `/member/chat/groups/${groupId}/messages`
    : `/society/chat/groups/${groupId}/messages`;
  const formData = new FormData();
  if (body.trim()) {
    formData.append('body', body.trim());
  }
  formData.append('photo', {
    uri: photoUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  const { data } = await client.post<ApiResponse<ChatMessage>>(url, formData, {
    transformRequest: (payload, headers) => {
      if (headers) {
        delete headers['Content-Type'];
      }
      return payload;
    },
  });
  return data.data;
}

export async function createGroupChatPoll(
  groupId: string,
  question: string,
  options: string[],
  expiresInMinutes?: number
): Promise<ChatMessage> {
  const { data } = await client.post<ApiResponse<ChatMessage>>(`/society/chat/groups/${groupId}/polls`, {
    question,
    options,
    expiresInMinutes,
  });
  return data.data;
}

export async function markGroupChatRead(memberPortal: boolean, groupId: string): Promise<void> {
  const url = memberPortal
    ? `/member/chat/groups/${groupId}/read`
    : `/society/chat/groups/${groupId}/read`;
  await client.post<ApiResponse<unknown>>(url);
}

export async function registerDevicePushToken(
  expoPushToken: string,
  platform: string
): Promise<void> {
  await client.post<ApiResponse<unknown>>('/devices/push-token', {
    expoPushToken,
    platform,
  });
}

export async function unregisterDevicePushToken(expoPushToken?: string): Promise<void> {
  await client.delete<ApiResponse<unknown>>('/devices/push-token', {
    data: expoPushToken ? { expoPushToken } : {},
  });
}

export function fetchPolls(memberPortal: boolean): Promise<PollSummary[]> {
  const url = memberPortal ? '/member/polls' : '/society/polls';
  return getData<PollSummary[]>(url);
}

export function fetchPollDetail(memberPortal: boolean, pollId: string): Promise<PollDetail> {
  const url = memberPortal ? `/member/polls/${pollId}` : `/society/polls/${pollId}`;
  return getData<PollDetail>(url);
}

export async function createPoll(payload: {
  question: string;
  options: string[];
  allMembers: boolean;
  memberIds: string[];
  expiresInMinutes?: number;
}): Promise<PollDetail> {
  const { data } = await client.post<ApiResponse<PollDetail>>('/society/polls', payload);
  return data.data;
}

export async function voteOnPoll(pollId: string, optionId: string): Promise<PollDetail> {
  const { data } = await client.post<ApiResponse<PollDetail>>(`/member/polls/${pollId}/vote`, {
    optionId,
  });
  return data.data;
}

export async function closePoll(pollId: string): Promise<PollDetail> {
  const { data } = await client.post<ApiResponse<PollDetail>>(`/society/polls/${pollId}/close`, {});
  return data.data;
}

export async function sharePollResults(
  pollId: string,
  payload: { allMembers: boolean; memberIds: string[] }
): Promise<PollDetail> {
  const { data } = await client.post<ApiResponse<PollDetail>>(
    `/society/polls/${pollId}/share-results`,
    payload
  );
  return data.data;
}

export function fetchComplaints(memberPortal: boolean): Promise<ComplaintSummary[]> {
  const url = memberPortal ? '/member/complaints' : '/society/complaints';
  return getData<ComplaintSummary[]>(url);
}

export function fetchComplaintDetail(memberPortal: boolean, complaintId: string): Promise<ComplaintDetail> {
  const url = memberPortal ? `/member/complaints/${complaintId}` : `/society/complaints/${complaintId}`;
  return getData<ComplaintDetail>(url);
}

export async function createComplaint(payload: {
  subject: string;
  description: string;
  category: string;
  photos?: { uri: string; fileName: string; mimeType: string }[];
}): Promise<ComplaintDetail> {
  const photos = payload.photos?.filter(Boolean) ?? [];
  if (photos.length > 0) {
    const formData = new FormData();
    formData.append('subject', payload.subject);
    formData.append('description', payload.description);
    formData.append('category', payload.category);
    photos.forEach((photo) => {
      formData.append('photos', {
        uri: photo.uri,
        name: photo.fileName,
        type: photo.mimeType,
      } as unknown as Blob);
    });
    const { data } = await client.post<ApiResponse<ComplaintDetail>>('/member/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  }
  const { data } = await client.post<ApiResponse<ComplaintDetail>>('/member/complaints', {
    subject: payload.subject,
    description: payload.description,
    category: payload.category,
  });
  return data.data;
}

export async function updateComplaint(
  complaintId: string,
  payload: { status: string; chairmanNote?: string }
): Promise<ComplaintDetail> {
  const { data } = await client.post<ApiResponse<ComplaintDetail>>(
    `/society/complaints/${complaintId}/update`,
    payload
  );
  return data.data;
}

export function fetchRules(memberPortal: boolean): Promise<import('../types/api').RuleSummary[]> {
  const url = memberPortal ? '/member/rules' : '/society/rules';
  return getData<import('../types/api').RuleSummary[]>(url);
}

export function fetchAboutSociety(memberPortal: boolean): Promise<import('../types/api').SocietyProfile> {
  const url = memberPortal ? '/member/about-society' : '/society/about-society';
  return getData<import('../types/api').SocietyProfile>(url);
}

export function fetchRuleDetail(memberPortal: boolean, ruleId: string): Promise<import('../types/api').RuleDetail> {
  const url = memberPortal ? `/member/rules/${ruleId}` : `/society/rules/${ruleId}`;
  return getData<import('../types/api').RuleDetail>(url);
}

export async function createRule(payload: {
  subject: string;
  description: string;
}): Promise<import('../types/api').RuleDetail> {
  const { data } = await client.post<ApiResponse<import('../types/api').RuleDetail>>('/society/rules', payload);
  return data.data;
}

export function fetchNotices(memberPortal: boolean): Promise<import('../types/api').NoticeSummary[]> {
  const url = memberPortal ? '/member/notices' : '/society/notices';
  return getData<import('../types/api').NoticeSummary[]>(url);
}

export function fetchNoticeDetail(
  memberPortal: boolean,
  noticeId: string
): Promise<import('../types/api').NoticeDetail> {
  const url = memberPortal ? `/member/notices/${noticeId}` : `/society/notices/${noticeId}`;
  return getData<import('../types/api').NoticeDetail>(url);
}

export async function createNotice(payload: {
  subject: string;
  description: string;
}): Promise<import('../types/api').NoticeDetail> {
  const { data } = await client.post<ApiResponse<import('../types/api').NoticeDetail>>('/society/notices', payload);
  return data.data;
}

export function fetchAmenityBookings(memberPortal: boolean): Promise<import('../types/api').AmenityBookingSummary[]> {
  const url = memberPortal ? '/member/amenity-bookings' : '/society/amenity-bookings';
  return getData<import('../types/api').AmenityBookingSummary[]>(url);
}

export function fetchAmenityBookingDetail(
  memberPortal: boolean,
  bookingId: string
): Promise<import('../types/api').AmenityBookingDetail> {
  const url = memberPortal
    ? `/member/amenity-bookings/${bookingId}`
    : `/society/amenity-bookings/${bookingId}`;
  return getData<import('../types/api').AmenityBookingDetail>(url);
}

export async function createAmenityBooking(payload: {
  amenityType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): Promise<import('../types/api').AmenityBookingDetail> {
  const { data } = await client.post<ApiResponse<import('../types/api').AmenityBookingDetail>>(
    '/member/amenity-bookings',
    payload
  );
  return data.data;
}

export async function cancelAmenityBooking(
  memberPortal: boolean,
  bookingId: string
): Promise<import('../types/api').AmenityBookingDetail> {
  const url = memberPortal
    ? `/member/amenity-bookings/${bookingId}/cancel`
    : `/society/amenity-bookings/${bookingId}/cancel`;
  const { data } = await client.post<ApiResponse<import('../types/api').AmenityBookingDetail>>(url, {});
  return data.data;
}

function audienceQuery(audience?: NotificationAudience | null): string {
  return audience ? `&audience=${encodeURIComponent(audience)}` : '';
}

export function fetchNotificationsPage(
  limit = 21,
  offset = 0,
  audience?: NotificationAudience | null
): Promise<NotificationPage> {
  return getData<NotificationPage>(
    `/notifications?limit=${limit}&offset=${offset}${audienceQuery(audience)}`
  );
}

export function fetchUnreadNotificationCount(
  audience?: NotificationAudience | null
): Promise<number> {
  return getData<{ unreadCount: number }>(`/notifications/unread-count${audience ? `?audience=${encodeURIComponent(audience)}` : ''}`).then(
    (payload) => payload.unreadCount ?? 0
  );
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data } = await client.post<ApiResponse<AppNotification>>(
    `/notifications/${notificationId}/read`
  );
  return data.data;
}

export async function markNotificationReadByTarget(params: {
  groupId?: string;
  pollId?: string;
  complaintId?: string;
  amenityBookingId?: string;
  ruleId?: string;
  noticeId?: string;
  visitorId?: string;
}): Promise<AppNotification> {
  const { data } = await client.post<ApiResponse<AppNotification>>('/notifications/read-by-target', null, {
    params,
  });
  return data.data;
}

export async function markAllNotificationsRead(
  audience?: NotificationAudience | null
): Promise<number> {
  const { data } = await client.post<ApiResponse<{ markedRead: number; unreadCount: number }>>(
    `/notifications/read-all${audience ? `?audience=${encodeURIComponent(audience)}` : ''}`
  );
  return data.data?.unreadCount ?? 0;
}

export async function fetchMemberProfile(): Promise<MemberProfile> {
  return getData<MemberProfile>('/member/profile');
}

export async function updateMemberProfile(payload: {
  firstName: string;
  lastName: string;
}): Promise<MemberProfile> {
  const { data } = await client.put<ApiResponse<MemberProfile>>('/member/profile', payload);
  return data.data;
}

export async function requestMemberEmailVerificationOtp(): Promise<{
  message: string;
  email: string;
  expiresInMinutes: number;
}> {
  const { data } = await client.post<
    ApiResponse<{ message: string; email: string; expiresInMinutes: number }>
  >('/member/profile/request-email-verification-otp');
  return data.data;
}

export async function verifyMemberEmailOtp(otp: string): Promise<{ message: string; emailVerified: boolean }> {
  const { data } = await client.post<ApiResponse<{ message: string; emailVerified: boolean }>>(
    '/member/profile/verify-email-otp',
    { otp }
  );
  return data.data;
}

// --- Visitor & Gate Keeper ---

export async function fetchGateKeeperDashboard(): Promise<GateKeeperDashboard> {
  return getData<GateKeeperDashboard>('/gatekeeper/dashboard');
}

export async function fetchChairmanVisitorDashboard(): Promise<ChairmanVisitorDashboard> {
  return getData<ChairmanVisitorDashboard>('/society/visitor-dashboard');
}

export async function searchResidentsForVisitor(q: string): Promise<ResidentSearchResult[]> {
  return getData<ResidentSearchResult[]>(`/gatekeeper/visitors/residents/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export async function createVisitorEntry(
  payload: {
    visitorName: string;
    mobileNumber: string;
    vehicleNumber?: string;
    visitorCount?: number;
    purpose: string;
    flatNumber: string;
    residentMemberId: string;
    expectedDurationMinutes?: number;
    remarks?: string;
  },
  photo?: { uri: string; fileName: string; mimeType: string } | null
): Promise<VisitorDetail> {
  if (photo) {
    const formData = new FormData();
    formData.append('visitorName', payload.visitorName);
    formData.append('mobileNumber', payload.mobileNumber);
    if (payload.vehicleNumber) formData.append('vehicleNumber', payload.vehicleNumber);
    formData.append('visitorCount', String(payload.visitorCount ?? 1));
    formData.append('purpose', payload.purpose);
    formData.append('flatNumber', payload.flatNumber);
    formData.append('residentMemberId', payload.residentMemberId);
    if (payload.expectedDurationMinutes != null) {
      formData.append('expectedDurationMinutes', String(payload.expectedDurationMinutes));
    }
    if (payload.remarks) formData.append('remarks', payload.remarks);

    const safeName = (photo.fileName || `visitor-${Date.now()}.jpg`).replace(/\s+/g, '_');
    const mimeType =
      photo.mimeType && photo.mimeType.startsWith('image/') ? photo.mimeType : 'image/jpeg';
    formData.append('photo', {
      uri: photo.uri,
      name: /\.(jpe?g|png|webp)$/i.test(safeName) ? safeName : `${safeName}.jpg`,
      type: mimeType,
    } as unknown as Blob);

    const { data } = await client.post<ApiResponse<VisitorDetail>>(
      '/gatekeeper/visitors/with-photo',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }
    );
    return data.data;
  }

  const { data } = await client.post<ApiResponse<VisitorDetail>>('/gatekeeper/visitors', payload);
  return data.data;
}

export async function fetchPendingVisitors(): Promise<VisitorSummary[]> {
  return getData<VisitorSummary[]>('/gatekeeper/visitors/pending');
}

export async function fetchGateKeeperVisitorHistory(params?: {
  status?: string;
  search?: string;
  residentMemberId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<VisitorHistoryPage> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.residentMemberId) query.set('residentMemberId', params.residentMemberId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.size != null) query.set('size', String(params.size));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return getData<VisitorHistoryPage>(`/gatekeeper/visitors/history${suffix}`);
}

export async function fetchChairmanVisitorHistory(params?: {
  status?: string;
  search?: string;
  residentMemberId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<VisitorHistoryPage> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.residentMemberId) query.set('residentMemberId', params.residentMemberId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.size != null) query.set('size', String(params.size));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return getData<VisitorHistoryPage>(`/society/visitors/history${suffix}`);
}

export async function checkInVisitor(visitorId: string): Promise<VisitorDetail> {
  const { data } = await client.put<ApiResponse<VisitorDetail>>(`/gatekeeper/visitors/${visitorId}/check-in`);
  return data.data;
}

export async function checkOutVisitor(visitorId: string): Promise<VisitorDetail> {
  const { data } = await client.put<ApiResponse<VisitorDetail>>(`/gatekeeper/visitors/${visitorId}/check-out`);
  return data.data;
}

export async function fetchMemberPendingVisitors(): Promise<VisitorSummary[]> {
  const page = await getData<VisitorHistoryPage>('/member/visitors/pending');
  return page.items ?? [];
}

export async function fetchMemberVisitorHistory(params?: {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<VisitorHistoryPage> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.size != null) query.set('size', String(params.size));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return getData<VisitorHistoryPage>(`/member/visitors/history${suffix}`);
}

export async function fetchMemberVisitorDetail(visitorId: string): Promise<VisitorDetail> {
  return getData<VisitorDetail>(`/member/visitors/${visitorId}`);
}

export async function approveVisitor(visitorId: string): Promise<VisitorDetail> {
  const { data } = await client.put<ApiResponse<VisitorDetail>>(`/member/visitors/${visitorId}/approve`);
  return data.data;
}

export async function rejectVisitor(visitorId: string, reason?: string): Promise<VisitorDetail> {
  const { data } = await client.put<ApiResponse<VisitorDetail>>(`/member/visitors/${visitorId}/reject`, { reason });
  return data.data;
}

export async function fetchGateKeeperAssignments(): Promise<GateKeeperAssignment[]> {
  return getData<GateKeeperAssignment[]>('/society/gatekeepers');
}

export async function assignGateKeeper(payload: { name: string; phone: string }): Promise<GateKeeperAssignment> {
  const { data } = await client.post<ApiResponse<GateKeeperAssignment>>('/society/gatekeeper/assign', payload);
  return data.data;
}

export async function removeGateKeeper(assignmentId: string): Promise<void> {
  await client.delete(`/society/gatekeeper/remove/${assignmentId}`);
}

export async function setGateKeeperActive(assignmentId: string, active: boolean): Promise<GateKeeperAssignment> {
  const { data } = await client.put<ApiResponse<GateKeeperAssignment>>(
    `/society/gatekeeper/${assignmentId}/active`,
    { active }
  );
  return data.data;
}

export async function resetGateKeeperPassword(assignmentId: string): Promise<void> {
  await client.post(`/society/gatekeeper/${assignmentId}/reset-password`);
}

export { isEmailNotVerifiedError };

export { API_BASE_URL };
