import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { clearSession, getToken } from './storage';
import { notifySessionInvalid } from './session';
import { notifyMaintenanceSettingsRequired } from './maintenanceSettingsGate';
import type {
  ApiResponse,
  ExpenseCategoryReportRow,
  LoginData,
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
  SocietySubscriptionStatus,
  PublicSubscriptionPlan,
  UpgradeQuote,
  AdditionalMembersQuote,
  UpdateMemberPayload,
  ReportEmailPayload,
  ReportEmailResult,
  SocietyOverview,
  MemberOverview,
  ChatThread,
  ChatThreadQuery,
  ChatMessage,
  ChatGroupSummary,
  PollDetail,
  PollSummary,
  AppNotification,
  NotificationPage,
} from '../types/api';
import { encryptPasswordForLogin } from '../crypto/rsaEncrypt';

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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      if (!url.includes('/auth/login')) {
        await clearSession();
        notifySessionInvalid();
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const url = error.config?.url ?? '';
      const body = error.response.data as { error?: string } | undefined;
      if (
        body?.error === 'MAINTENANCE_SETTINGS_REQUIRED' &&
        !url.includes('/society/settings/maintenance')
      ) {
        notifyMaintenanceSettingsRequired();
      }
    }
    return Promise.reject(error);
  }
);

const SOCIETY_STAFF_ROLES = new Set(['CHAIRMAN', 'TREASURER', 'USER', 'AUDITOR']);
const SOCIETY_APP_ROLES = new Set([...SOCIETY_STAFF_ROLES, 'MEMBER']);

export function isSocietyStaffRole(role: string): boolean {
  return SOCIETY_STAFF_ROLES.has((role ?? '').toUpperCase());
}

export function isMemberRole(role: string): boolean {
  return (role ?? '').toUpperCase() === 'MEMBER';
}

/** Society staff or flat member — both use the mobile app. */
export function isSocietyRole(role: string): boolean {
  return SOCIETY_APP_ROLES.has((role ?? '').toUpperCase());
}

async function getData<T>(url: string): Promise<T> {
  const { data } = await client.get<ApiResponse<T>>(url);
  return data.data;
}

/** Public catalog — no auth required. */
export async function fetchPublicPlans(): Promise<PublicSubscriptionPlan[]> {
  const { data } = await axios.get<ApiResponse<PublicSubscriptionPlan[]>>(
    `${API_BASE_URL}/subscription-plans`,
    { timeout: 30000 }
  );
  return (data.data ?? []).filter((p) => p.active);
}

export async function login(email: string, password: string): Promise<LoginData> {
  const encryptedPassword = encryptPasswordForLogin(password);
  const { data } = await client.post<ApiResponse<LoginData>>('/auth/login', {
    email: email.trim().toLowerCase(),
    encryptedPassword,
    clientType: MOBILE_CLIENT_TYPE,
  });
  const payload = data.data;
  const role = (payload.role ?? '').toUpperCase();
  if (role === 'PRODUCT_OWNER') {
    throw new Error('Product owner accounts use the web dashboard. This app is for society users only.');
  }
  if (!isSocietyRole(role)) {
    throw new Error('This account cannot use the society app. Use the web app or contact your administrator.');
  }
  if (!payload.societyId) {
    throw new Error('No society linked to this account.');
  }
  return payload;
}

export const fetchSocietyModules = () => getData<NavModule[]>('/modules/society');
export const fetchMemberModules = () => getData<NavModule[]>('/modules/member');
export const fetchOverview = () => getData<SocietyOverview>('/society/dashboard/overview');
export const fetchMemberOverview = () => getData<MemberOverview>('/member/overview');
export const fetchMemberMaintenanceHistory = () =>
  getData<RecentExpense[]>('/member/maintenance');

export async function changeFirstLoginPassword(newPassword: string): Promise<void> {
  const encryptedNewPassword = encryptPasswordForLogin(newPassword);
  await client.post<ApiResponse<{ message: string }>>('/auth/first-login/change-password', {
    encryptedNewPassword,
  });
}
export const fetchRecentExpenses = () => getData<RecentExpense[]>('/society/dashboard/recent-expenses');
export const fetchExpenseHistory = () => getData<RecentExpense[]>('/expenses');
export const fetchMaintenanceHistory = () => getData<RecentExpense[]>('/expenses/maintenance');
export const fetchOtherIncomeHistory = () => getData<RecentExpense[]>('/expenses/income');
export const fetchMaintenancePending = () =>
  getData<PendingMaintenanceMember[]>('/expenses/maintenance/pending');
export const fetchMembers = () => getData<SocietyMember[]>('/society/members');

export const fetchSubscriptionStatus = () =>
  getData<SocietySubscriptionStatus>('/society/subscription/status');

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

export function fetchNotificationsPage(limit = 7, offset = 0): Promise<NotificationPage> {
  return getData<NotificationPage>(`/notifications?limit=${limit}&offset=${offset}`);
}

export function fetchUnreadNotificationCount(): Promise<number> {
  return getData<{ unreadCount: number }>('/notifications/unread-count').then(
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
}): Promise<AppNotification> {
  const { data } = await client.post<ApiResponse<AppNotification>>('/notifications/read-by-target', null, {
    params,
  });
  return data.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await client.post<ApiResponse<{ markedRead: number; unreadCount: number }>>(
    '/notifications/read-all'
  );
  return data.data?.unreadCount ?? 0;
}

export { API_BASE_URL };
