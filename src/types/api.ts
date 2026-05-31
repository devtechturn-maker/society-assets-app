export interface ApiResponse<T> {
  message: string;
  data: T;
  timestamp: string;
}

export interface SocietySubscriptionStatus {
  status: string;
  canAccessApp: boolean;
  renewRequired: boolean;
  message?: string;
  portalUrl?: string;
  planId?: string;
  planName?: string;
  planCode?: string;
  price?: number;
  billingCycle?: string;
  validUntil?: string | null;
  paidAt?: string | null;
}

export interface PublicSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  price: number;
  memberLimit: number;
  active: boolean;
}

export interface LoginData {
  token: string;
  role: string;
  societyId: string | null;
  firstLogin: boolean;
  userId: string;
  subscription?: SocietySubscriptionStatus;
}

export interface NavModule {
  code: string;
  title: string;
  routePath: string;
  icon: string;
  sortOrder: number;
}

export interface SocietyOverview {
  societyId: string;
  societyName: string;
  totalIncome: number;
  totalMaintenanceIncome?: number;
  totalOtherIncome?: number;
  totalExpenses: number;
  cashOnHand: number;
  expenseCount: number;
  totalUsers: number;
}

export interface MemberOverview {
  societyId: string;
  societyName: string;
  memberId: string;
  memberName: string;
  flatNumber: string;
  email: string;
  phone: string;
  lastPaymentAmount: number;
  lastPaymentDate: string | null;
  totalDueAmount: number;
  remainingDueAmount: number;
  paymentType: string;
}

export interface RecentExpense {
  expenseId: string;
  entryType?: 'INCOME' | 'EXPENSE';
  category: string;
  memberName?: string;
  memberEmail?: string;
  flatNumber?: string;
  description: string;
  amount: number;
  expenseDate: string | null;
  maintenanceFromMonth?: string;
  maintenanceToMonth?: string;
  paymentType?: string;
  monthlyMaintenanceAmount?: number;
  carryForwardDue?: number;
  penaltyAmount?: number;
  totalDueAmount?: number;
  remainingDueAmount?: number;
  createdAt: string | null;
}

export interface PendingMaintenanceMember {
  memberId: string;
  memberName: string;
  memberEmail: string;
  flatNumber: string;
  lastPaidAmount: number;
  totalDueAmount: number;
  remainingDueAmount: number;
  lastPaymentDate: string | null;
  lastPaymentType: string;
}

export interface MaintenanceSettings {
  defaultMaintenanceAmount: number;
  maintenancePenaltyGraceDay: number;
  maintenancePenaltyAmount: number;
  allowCustomMemberMaintenance: boolean;
}

export interface ReportSummary {
  totalMaintenanceCollected: number;
  totalOtherIncome?: number;
  totalExpenseOutflow: number;
  netBalance: number;
  totalPenaltyCollected: number;
  totalPending: number;
}

export interface MonthlyMaintenanceReportRow {
  month: string;
  collected: number;
  penalty: number;
  totalDue: number;
  pending: number;
}

export interface ExpenseCategoryReportRow {
  category: string;
  amount: number;
}

export interface PaymentModeReport {
  cashIn: number;
  onlineIn: number;
  cashOut: number;
  onlineOut: number;
}

export interface SocietyMember {
  id: string;
  name: string;
  email: string;
  flatNumber: string;
  phone: string;
  customMaintenanceAmount?: number;
  createdAt: string | null;
}

export interface MemberUploadResult {
  added: number;
  skipped: number;
  duplicates: number;
}

export interface MemberExcelValidationRow {
  rowNumber: number;
  name: string;
  email: string;
  flatNumber: string;
  phone: string;
  customMaintenanceAmount: number;
  valid: boolean;
  errors: string[];
}

export interface MemberExcelValidation {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    canImport: boolean;
  };
  rows: MemberExcelValidationRow[];
}

export interface UpdateMemberPayload {
  name: string;
  flatNumber: string;
  phone: string;
  customMaintenanceAmount: number | null;
}

export interface SocietyContractRow {
  id: string;
  contractType: string;
  vendorName: string;
  referenceNote: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  weekBeforeExpiryReminderSent: boolean;
  createdAt: string;
}

export interface SocietyContractTypeOption {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface ReportEmailPayload {
  sendToAllMembers: boolean;
  memberIds: string[];
  customEmails: string[];
  includeAllReports: boolean;
  reportTypes: string[];
}

export interface ReportEmailResult {
  sentCount: number;
  reportCount: number;
  recipients: string[];
}
