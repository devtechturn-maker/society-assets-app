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
  memberLimit?: number;
  additionalMemberPrice?: number;
  additionalMemberSlots?: number;
  currentMemberCount?: number;
  effectiveMemberLimit?: number;
  unlimitedMembers?: boolean;
  membersRemaining?: number;
  daysUsed?: number;
  daysRemaining?: number;
  validUntil?: string | null;
  paidAt?: string | null;
}

export interface PlanPriceBreakdown {
  basePrice: number;
  includedMemberLimit: number;
  additionalMemberSlots: number;
  additionalMemberPrice: number;
  additionalMembersTotal: number;
  fullPeriodTotal: number;
}

export interface UpgradeQuote {
  currentPlanName: string;
  newPlanName: string;
  amountDue: number;
  billingCycle?: string;
  creditFromCurrentPlan?: number;
  chargeForNewPlan?: number;
  daysUsed?: number;
  daysRemaining?: number;
  unusedTimeRatio?: number;
  targetAdditionalMemberSlots?: number;
  newPriceBreakdown?: PlanPriceBreakdown;
  minimumChargeApplied?: boolean;
}

export interface AdditionalMembersQuote {
  additionalMembers: number;
  pricePerMember: number;
  amountDue: number;
  newEffectiveLimit: number;
}

export interface PublicSubscriptionPlan {
  additionalMemberPrice?: number;
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
  memberProfile?: {
    memberId: string;
    flatNumber: string;
    name: string;
    email: string;
  };
  canSwitchToMemberView?: boolean;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface MemberProfile {
  memberId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  flatNumber: string;
  phone: string;
  emailVerified: boolean;
  emailVerificationRequired: boolean;
  societyName: string;
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
  onlinePaymentEnabled?: boolean;
  payableAmount?: number;
  canPayOnline?: boolean;
  maintenanceFromMonth?: string;
  maintenanceToMonth?: string;
  paymentUnavailableMessage?: string;
}

export interface MemberMaintenanceDue {
  onlinePaymentEnabled: boolean;
  onlinePaymentConfigured?: boolean;
  paymentUnavailableMessage?: string;
  alreadyPaid: boolean;
  alreadyPaidMessage: string;
  monthlyMaintenanceAmount: number;
  carryForwardDue: number;
  penaltyAmount: number;
  totalDueAmount: number;
  payableAmount: number;
  maintenanceFromMonth: string;
  maintenanceToMonth: string;
  description: string;
  canPayOnline: boolean;
}

export interface MemberMaintenanceCheckout {
  required: boolean;
  paymentId: string;
  amountInr: number;
  description: string;
  maintenanceFromMonth: string;
  maintenanceToMonth: string;
  keyId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  societyName?: string;
  memberName?: string;
  flatNumber?: string;
  message?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface MemberMaintenanceVerifyResult {
  status: string;
  expenseId?: string;
  amount?: number;
  remainingDueAmount?: number;
  message?: string;
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

export interface SocietyMemberPaymentSettings {
  enabled: boolean;
  configured: boolean;
  keyId: string;
  keySecretMasked: string;
  testMode: boolean;
  memberPaymentsReady: boolean;
  message?: string;
  routeEnabled?: boolean;
  usesRoute?: boolean;
  routeStatus?: string;
  routeError?: string;
  linkedAccountId?: string;
  bankIfsc?: string;
  bankBeneficiaryName?: string;
  bankAccountMasked?: string;
  manualKeysConfigured?: boolean;
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

export interface ChatMessage {
  id: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  senderFlat?: string;
  mine: boolean;
}

export interface ChatGroupSummary {
  conversationId: string;
  groupName: string;
  societyName?: string;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  memberCount: number;
}

export interface ChatThread {
  conversationId: string | null;
  groupName?: string;
  societyName?: string;
  peerName: string;
  unreadCount: number;
  firstUnreadMessageId?: string | null;
  hasMoreOlder?: boolean;
  memberCount?: number;
  messages: ChatMessage[];
}

export interface ChatThreadQuery {
  limit?: number;
  before?: string;
  after?: string;
}

export interface PollOption {
  optionId: string;
  label: string;
  sortOrder: number;
  voteCount?: number;
  percentage?: number;
  voters?: { userId: string; name: string; votedAt: string }[];
}

export interface PollSummary {
  pollId: string;
  question: string;
  status: 'ACTIVE' | 'CLOSED';
  allMembers: boolean;
  createdAt: string;
  closedAt: string | null;
  totalVotes: number;
  participantCount: number;
  hasVoted: boolean;
  canVote: boolean;
  showResults: boolean;
  createdByName?: string;
}

export interface PollDetail extends PollSummary {
  myVoteOptionId?: string;
  options: PollOption[];
  sharedToCount?: number;
}

export interface ComplaintSummary {
  complaintId: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  memberName?: string;
  flatNumber?: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  description: string;
  chairmanNote?: string | null;
  memberId?: string;
}

export interface AmenityBookingSummary {
  bookingId: string;
  amenityType: string;
  amenityLabel: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  memberName?: string;
  flatNumber?: string;
  memberId?: string;
  mine?: boolean;
}

export type AmenityBookingDetail = AmenityBookingSummary;

export interface AppNotification {
  notificationId: string;
  type: string;
  title: string;
  subtitle: string;
  body: string;
  audienceRole?: 'CHAIRMAN' | 'MEMBER';
  groupId?: string;
  pollId?: string;
  complaintId?: string;
  amenityBookingId?: string;
  societyId?: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  hasMore: boolean;
  nextOffset: number;
}
