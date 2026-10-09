export interface ApiResponse<T> {
  message: string;
  data: T;
  timestamp: string;
}

/** A 3/6/9/12 month plan priced by the server for this society's flats (prices for the whole period). */
export interface DurationPlanCard {
  id: string;
  planId: string;
  name: string;
  months: number;
  label: string;
  flatCount: number;
  includedFlats: number;
  extraFlats: number;
  pricePerFlat: number;
  extraFlatPrice: number;
  baseAmount: number;
  extraFlatAmount: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  /** Same as total (kept for older screens). */
  amount: number;
  monthlyEquivalent: number;
  trialDays: number;
  graceDays: number;
  /** When the paid period would start/end if bought now. */
  startsAt?: string;
  endsAt?: string;
}

/** Pricing snapshot stored with the society's last plan purchase. */
export interface SubscriptionPurchase {
  planCode: string;
  months: number;
  flatCount: number;
  includedFlats: number;
  extraFlats: number;
  pricePerFlat: number;
  extraFlatPrice: number;
  baseAmount: number;
  extraFlatAmount: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
}

/** TRIAL, ACTIVE, EXPIRING (last days), GRACE_PERIOD, EXPIRED, PENDING. */
export type SubscriptionLifecycle = 'TRIAL' | 'ACTIVE' | 'EXPIRING' | 'GRACE_PERIOD' | 'EXPIRED' | 'PENDING' | string;

export interface SocietySubscriptionStatus {
  status: string;
  canAccessApp: boolean;
  renewRequired: boolean;
  needsPlanPurchase?: boolean;
  onTrial?: boolean;
  message?: string;
  portalUrl?: string;
  planId?: string;
  planName?: string;
  planCode?: string;
  price?: number;
  pricePerFlat?: number;
  flatCount?: number;
  trialDaysConfigured?: number;
  durationPlans?: DurationPlanCard[];
  billingMonths?: number;
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
  periodStart?: string | null;
  lifecycleStatus?: SubscriptionLifecycle;
  graceDays?: number;
  graceEndsAt?: string | null;
  graceDaysRemaining?: number;
  inGracePeriod?: boolean;
  expiringSoon?: boolean;
  lastPurchase?: SubscriptionPurchase;
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

export interface LoginAccountOption {
  memberId: string | null;
  userId: string;
  societyId: string;
  societyName: string;
  role: string;
  email: string;
  flatNumber: string;
  displayName: string;
}

export type FlatNumberFormat = 'FLOOR' | 'SEQUENTIAL' | 'CUSTOM' | 'EXPLICIT';

export type SmsLoginVerifyResult =
  | ({ selectionRequired: false; onboardingRequired?: false } & LoginData)
  | {
      selectionRequired: true;
      onboardingRequired?: false;
      selectionToken: string;
      accounts: LoginAccountOption[];
    }
  | {
      onboardingRequired: true;
      selectionRequired?: false;
      selectionToken: string;
      accounts?: LoginAccountOption[];
    };

export interface OnboardingSocietyOption {
  societyId: string;
  societyName: string;
  totalFlats?: number | null;
  totalBuildings?: number | null;
  openFlats: number;
}

export interface OnboardingOpenFlat {
  flatId: string;
  flatNumber: string;
  /** Present when a reserved (unlinked) member already exists for claim flows. */
  memberId?: string | null;
}

/** Society flat inventory row for office dropdowns (add/edit member, income, etc.). */
export interface SocietyInventoryFlat {
  flatId: string;
  flatNumber: string;
  status?: string | null;
  available: boolean;
  memberId?: string | null;
}

export interface LoginData {
  token: string;
  role: string;
  societyId: string | null;
  firstLogin: boolean;
  userId: string;
  activeMemberId?: string | null;
  subscription?: SocietySubscriptionStatus;
  memberProfile?: {
    memberId: string;
    flatNumber: string;
    name: string;
    email: string;
  };
  canSwitchToMemberView?: boolean;
  email?: string;
  emailVerified?: boolean;
  /** True when member must capture/verify email before using the app. */
  profileCompletionRequired?: boolean;
  /** True when stored email is a phone-login placeholder, not a real inbox. */
  emailNeedsCapture?: boolean;
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
  profileCompletionRequired?: boolean;
  emailNeedsCapture?: boolean;
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
  /** OWNER, OWNER_RENTED_OUT (owner while a tenant lives there) or TENANT. */
  occupancy?: 'OWNER' | 'OWNER_RENTED_OUT' | 'TENANT';
  canManageGuests?: boolean;
  maintenanceVisible?: boolean;
  rentalStartDate?: string;
  rentalEndDate?: string;
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
  configured: boolean;
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
  lastLoginAt?: string | null;
  ownershipLabel?: string;
  isTreasurer?: boolean;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  flatNumber: string;
  phone: string;
  email?: string;
  lastLoginAt?: string | null;
  ownershipLabel?: string;
  isTreasurer?: boolean;
}

export type FamilyRelationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER';
export type MemberVehicleType = 'TWO_WHEELER' | 'FOUR_WHEELER' | 'OTHER';

export interface MemberFamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  phone?: string | null;
  age?: number | null;
  adult: boolean;
  createdAt: string;
}

export interface MemberVehicleRecord {
  id: string;
  vehicleType: MemberVehicleType;
  registrationNumber: string;
  makeModel?: string | null;
  color?: string | null;
  parkingSlot?: string | null;
  createdAt: string;
}

export interface FamilyMemberPayload {
  name: string;
  relationship: FamilyRelationship;
  phone?: string;
  age?: number;
  adult?: boolean;
}

export interface VehiclePayload {
  vehicleType: MemberVehicleType;
  registrationNumber: string;
  makeModel?: string;
  color?: string;
  parkingSlot?: string;
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

export interface ReportDownloadPayload {
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
  messageType?: 'TEXT' | 'POLL' | 'IMAGE';
  pollId?: string;
  poll?: PollDetail;
  attachmentUrl?: string;
  localPreviewUri?: string;
  sentAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  senderFlat?: string;
  mine: boolean;
  /** Client-only optimistic fields (not from API). */
  clientId?: string;
  localStatus?: 'sending' | 'sent' | 'failed';
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
  expiresAt?: string | null;
  expired?: boolean;
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
  attachments?: { index: number; url: string; memberUrl?: string }[];
}

export interface RuleSummary {
  ruleId: string;
  subject: string;
  description: string;
  createdAt: string;
  createdByName?: string;
}

export type RuleDetail = RuleSummary;

export interface NoticeSummary {
  noticeId: string;
  subject: string;
  description: string;
  createdAt: string;
  createdByName?: string;
}

export type NoticeDetail = NoticeSummary;

export interface SocietyProfile {
  societyId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  aboutDescription: string | null;
  yearEstablished: number | null;
  totalFlats: number | null;
  totalBlocks: number | null;
  registrationNumber: string | null;
  amenitiesSummary: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
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
  audienceRole?: 'CHAIRMAN' | 'MEMBER' | 'GATEKEEPER';
  groupId?: string;
  pollId?: string;
  complaintId?: string;
  amenityBookingId?: string;
  ruleId?: string;
  noticeId?: string;
  visitorId?: string;
  eventId?: string;
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

export interface VisitorSummary {
  id: string;
  visitorName: string;
  mobileNumber: string;
  flatNumber: string;
  residentName: string;
  vehicleNumber?: string | null;
  visitorCount: number;
  purpose: string;
  status: string;
  photoPath?: string | null;
  photoUrl?: string | null;
  memberPhotoUrl?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  ownerName?: string | null;
  currentTenantName?: string | null;
  addedByName?: string | null;
  addedByResident?: boolean;
  guestRelationship?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface VisitorDetail extends VisitorSummary {
  expectedDurationMinutes?: number | null;
  remarks?: string | null;
  rejectionReason?: string | null;
  approvalExpiresAt?: string | null;
  residentMemberId?: string;
  durationMinutes?: number;
}

export interface VisitorHistoryPage {
  items: VisitorSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GateKeeperDashboard {
  societyName?: string;
  todayTotal: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  recent: VisitorSummary[];
}

export interface ChairmanVisitorDashboard {
  todayTotal: number;
  approved: number;
  rejected: number;
  pending: number;
  checkedIn: number;
  recentLogs: VisitorSummary[];
}

export interface GateKeeperAssignment {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  active: boolean;
  assignedAt: string;
}

export interface ResidentSearchResult {
  memberId: string;
  flatNumber: string;
  name: string;
  phone?: string | null;
}

// ---------------------------------------------------------------- Society events & festivals

export type SocietyEventType = 'FESTIVAL' | 'EVENT' | 'FUNCTION' | 'SPORTS' | 'CULTURAL' | 'OTHER';
export type SocietyEventPhase = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CLOSED' | 'CANCELLED';
export type EventEntryKind = 'CONTRIBUTION' | 'INCOME' | 'EXPENSE';
export type EventEntryStatus = 'CONFIRMED' | 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'UNPAID' | 'REJECTED';
export type EventPaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
export type EventContributionStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'EXEMPT';
export type EventEntryAction = 'APPROVE' | 'REJECT' | 'VERIFY' | 'MARK_PAID' | 'VOID';
export type EventReportType = 'SUMMARY' | 'FLATS' | 'EXPENSES' | 'STATEMENT';

export interface SocietyEventTotals {
  collected: number;
  contributionCollected: number;
  otherIncome: number;
  spent: number;
  balance: number;
  expected: number;
  pendingContribution: number;
  flatCount: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  exemptCount: number;
  collectionProgress: number;
  expenseCount?: number;
}

export interface SocietyEventInfo {
  eventId: string;
  name: string;
  eventType: SocietyEventType;
  customTypeLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  status: 'PLANNED' | 'CLOSED' | 'CANCELLED';
  phase: SocietyEventPhase;
  contributionRequired: boolean;
  defaultContributionAmount?: number | null;
  showContributorList: boolean;
  closedAt?: string | null;
}

export interface MyEventContribution {
  contributionId: string;
  flatNumber: string;
  expected: number;
  paid: number;
  pendingVerification: number;
  remaining: number;
  status: EventContributionStatus;
  payments?: {
    transactionId: string;
    amount: number;
    txnDate: string;
    paymentMethod?: EventPaymentMethod | null;
    referenceNo?: string | null;
    status: EventEntryStatus | 'VOID';
    reviewNote?: string | null;
  }[];
}

/** Staff list rows carry totals at top level; member rows also carry `myContribution`. */
export interface SocietyEventListItem extends SocietyEventInfo, SocietyEventTotals {
  needsAttentionCount?: number;
  myContribution?: MyEventContribution | null;
  canManage?: boolean;
}

export interface EventCategoryAmount {
  categoryCode: string;
  label: string;
  amount: number;
}

export interface EventBudgetLine {
  categoryCode: string;
  label: string;
  budget: number;
  used: number;
  remaining: number;
  usedPercent: number;
  alert: 'OK' | 'NEAR' | 'OVER';
}

export interface EventTransaction {
  transactionId: string;
  kind: EventEntryKind;
  direction: 'IN' | 'OUT';
  categoryCode?: string | null;
  categoryLabel: string;
  amount: number;
  txnDate: string;
  paymentMethod?: EventPaymentMethod | null;
  referenceNo?: string | null;
  partyName?: string | null;
  description?: string | null;
  status: EventEntryStatus;
  reviewNote?: string | null;
  flatId?: string;
  flatNumber?: string;
  payerName?: string | null;
  recordedByName?: string | null;
  voided: boolean;
  voidReason?: string | null;
  attachmentCount: number;
  canEdit: boolean;
  canVoid: boolean;
  canApprove: boolean;
  canVerify: boolean;
  canMarkPaid: boolean;
  budgetWarning?: string;
}

export interface SocietyEventDetail extends SocietyEventInfo {
  totals: SocietyEventTotals;
  workQueue: {
    billsToPay: number;
    pendingApprovalCount: number;
    pendingApprovalAmount: number;
    toVerifyCount: number;
    toVerifyAmount: number;
    expenseCount: number;
  };
  permissions: {
    isStaff: boolean;
    isCommittee: boolean;
    canEdit: boolean;
    canRecord: boolean;
    canApprove: boolean;
    canManageCommittee: boolean;
    canClose: boolean;
    canCancel: boolean;
    canReopen: boolean;
  };
  committee: { memberId: string; name: string; flatNumber: string }[];
  incomeByCategory: EventCategoryAmount[];
  expenseByCategory: EventCategoryAmount[];
  budget: {
    total: number;
    used: number;
    remaining: number;
    unbudgetedSpend: number;
    usedPercent: number;
    items: EventBudgetLine[];
  };
  recentTransactions: EventTransaction[];
  topPending: {
    contributionId: string;
    flatNumber: string;
    memberName?: string | null;
    remaining: number;
  }[];
}

export interface MemberEventDetail extends SocietyEventInfo {
  totals: SocietyEventTotals;
  incomeByCategory: EventCategoryAmount[];
  expenseByCategory: EventCategoryAmount[];
  expenses: { txnDate: string; categoryLabel: string; paidTo?: string | null; description?: string | null; amount: number }[];
  myContribution: MyEventContribution | null;
  committee: { name: string; flatNumber: string }[];
  contributorList?: { flatNumber: string; status: EventContributionStatus }[];
  canManage: boolean;
  canSubmitPayment: boolean;
}

export interface EventContributionRow {
  contributionId: string;
  flatId: string;
  flatNumber: string;
  memberName?: string | null;
  expected: number;
  paid: number;
  pendingVerification: number;
  remaining: number;
  status: EventContributionStatus;
}

export interface EventCategoryOption {
  id: string;
  kind: 'INCOME' | 'EXPENSE';
  code: string;
  label: string;
}

export interface CreateSocietyEventPayload {
  name: string;
  eventType: SocietyEventType;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  contributionRequired: boolean;
  defaultContributionAmount?: number | null;
  applyDefaultTo?: 'ALL_FLATS' | 'OCCUPIED_FLATS' | 'SELECTED';
  copyFromEventId?: string | null;
  notifyMembers?: boolean;
}

export interface EventEntryPayload {
  kind: EventEntryKind;
  amount: number;
  txnDate?: string;
  paymentMethod?: EventPaymentMethod | null;
  referenceNo?: string | null;
  description?: string | null;
  flatId?: string;
  categoryCode?: string;
  partyName?: string | null;
  paid?: boolean;
  confirmDuplicate?: boolean;
}

/** Guest added in advance by the resident (owner or active tenant). */
export interface GuestPassInput {
  guestName: string;
  mobileNumber: string;
  relationship?: string;
  purpose?: string;
  visitorCount?: number;
  vehicleNumber?: string;
  validFrom: string;
  validUntil: string;
}

export interface FlatTenancy {
  id: string;
  flatMemberId: string;
  flatNumber: string;
  ownerName: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  /** ACTIVE, UPCOMING, EXPIRED or ENDED */
  status: string;
  endedAt?: string | null;
}

export interface FlatTenancyInput {
  flatMemberId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
}
