import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import {
  closeSocietyEvent,
  downloadEventReceipt,
  downloadEventReport,
  eventEntryAction,
  fetchEventCategories,
  fetchEventContributions,
  fetchEventTransactions,
  fetchSocietyEventDetail,
  remindPendingEventContributions,
  reopenSocietyEvent,
  setEventContributionAmount,
} from '../../services/api';
import type {
  EventCategoryOption,
  EventContributionRow,
  EventContributionStatus,
  EventEntryKind,
  EventPaymentMethod,
  EventReportType,
  EventTransaction,
  SocietyEventDetail,
} from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import {
  PAYMENT_METHODS,
  compactInr,
  contributionLabel,
  contributionTone,
  dateRange,
  entryStatusLabel,
  eventTypeLabel,
  paymentMethodLabel,
  phaseLabel,
  shortDate,
} from '../../utils/eventFormat';
import { formatInr } from '../../utils/format';
import { Badge } from '../dashboard/Badge';
import { ListEmpty, ListError, ListLoading } from '../dashboard/ListStates';
import { SectionCard } from '../dashboard/SectionCard';
import { AmountBar, ChipRow, EventSheet, SheetButtons, SheetField, SheetInput } from './EventSheet';
import { EventEntrySheet } from './EventEntrySheet';

const IN_COLOR = '#16a34a';
const OUT_COLOR = '#ea580c';

type Tab = 'overview' | 'flats' | 'ledger';
type FlatFilter = 'ALL' | EventContributionStatus;
type LedgerView = 'ALL' | 'INCOME' | 'EXPENSE' | 'PENDING';

const REPORTS: { label: string; value: EventReportType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Financial summary', value: 'SUMMARY', icon: 'pie-chart-outline' },
  { label: 'Flat-wise contributions', value: 'FLATS', icon: 'home-outline' },
  { label: 'Expense report', value: 'EXPENSES', icon: 'receipt-outline' },
  { label: 'Complete statement', value: 'STATEMENT', icon: 'document-text-outline' },
];

/** Event dashboard for chairman / treasurer / committee: balance at a glance, flats, ledger and actions. */
export function EventManageView({
  eventId,
  onBack,
  onChanged,
}: {
  eventId: string;
  onBack: () => void;
  onChanged?: () => void;
}) {
  const { theme } = useTheme();
  const { confirm, toast } = useAppAlert();
  const [detail, setDetail] = useState<SocietyEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [contributions, setContributions] = useState<EventContributionRow[]>([]);
  const [categories, setCategories] = useState<{ income: EventCategoryOption[]; expense: EventCategoryOption[] }>({
    income: [],
    expense: [],
  });
  const [ledger, setLedger] = useState<EventTransaction[]>([]);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerView, setLedgerView] = useState<LedgerView>('ALL');
  const [flatFilter, setFlatFilter] = useState<FlatFilter>('ALL');
  const [flatQuery, setFlatQuery] = useState('');

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<EventEntryKind>('CONTRIBUTION');
  const [entryFlatId, setEntryFlatId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState<EventTransaction | null>(null);
  const [reasonFor, setReasonFor] = useState<'VOID' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [paidMethod, setPaidMethod] = useState<EventPaymentMethod | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkApplyTo, setBulkApplyTo] = useState<'OCCUPIED_FLATS' | 'ALL_FLATS'>('OCCUPIED_FLATS');
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      setError(null);
      setDetail(await fetchSocietyEventDetail(eventId));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this event'));
    }
  }, [eventId]);

  const loadContributions = useCallback(async () => {
    try {
      setContributions((await fetchEventContributions(eventId)).items);
    } catch {
      setContributions([]);
    }
  }, [eventId]);

  const loadLedger = useCallback(
    async (page: number, view: LedgerView) => {
      try {
        const result = await fetchEventTransactions(eventId, { view, page, size: 20 });
        setLedger((current) => (page === 0 ? result.content : [...current, ...result.content]));
        setLedgerPage(page);
        setLedgerHasMore(page + 1 < result.totalPages);
      } catch (err) {
        toast(apiErrorMessage(err, 'Could not load transactions'), 'error');
      }
    },
    [eventId, toast]
  );

  useEffect(() => {
    void loadDetail();
    void loadContributions();
    void fetchEventCategories().then(setCategories).catch(() => undefined);
  }, [loadDetail, loadContributions]);

  useEffect(() => {
    if (tab === 'ledger') void loadLedger(0, ledgerView);
  }, [tab, ledgerView, loadLedger]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDetail(), loadContributions(), tab === 'ledger' ? loadLedger(0, ledgerView) : null]);
    onChanged?.();
  }, [loadDetail, loadContributions, loadLedger, tab, ledgerView, onChanged]);

  async function onPullRefresh() {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }

  const visibleFlats = useMemo(() => {
    const q = flatQuery.trim().toLowerCase();
    return contributions.filter(
      (row) =>
        (flatFilter === 'ALL' || row.status === flatFilter) &&
        (!q || row.flatNumber.toLowerCase().includes(q) || (row.memberName ?? '').toLowerCase().includes(q))
    );
  }, [contributions, flatFilter, flatQuery]);

  if (error && !detail) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.pageBg }]}>
        <BackBar onBack={onBack} />
        <ListError message={error} onRetry={() => void loadDetail()} />
      </View>
    );
  }
  if (!detail) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.pageBg }]}>
        <BackBar onBack={onBack} />
        <ListLoading />
      </View>
    );
  }

  const ev = detail;
  const perms = ev.permissions;
  const voluntary = !ev.contributionRequired;
  const attention = ev.workQueue.pendingApprovalCount + ev.workQueue.toVerifyCount;
  const expenseMax = Math.max(1, ...ev.expenseByCategory.map((row) => row.amount));
  const incomeLines = [
    ...(ev.totals.contributionCollected > 0 ? [{ label: 'Flat contributions', amount: ev.totals.contributionCollected }] : []),
    ...ev.incomeByCategory.map((row) => ({ label: row.label, amount: row.amount })),
  ];
  const incomeMax = Math.max(1, ...incomeLines.map((row) => row.amount));

  function openEntry(kind: EventEntryKind, flatId: string | null = null) {
    setEntryKind(kind);
    setEntryFlatId(flatId);
    setEntryOpen(true);
  }

  async function shareReport(type: EventReportType) {
    setMenuOpen(false);
    try {
      const file = await downloadEventReport(eventId, type, false);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: ev.name });
      } else {
        toast('Report saved, but sharing is not available on this device.', 'info');
      }
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not generate the report'), 'error');
    }
  }

  async function openReceipt(txn: EventTransaction, index: number) {
    try {
      const file = await downloadEventReceipt(eventId, txn.transactionId, index);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle: 'Receipt' });
      }
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not open the receipt'), 'error');
    }
  }

  async function runAction(
    txn: EventTransaction,
    action: 'APPROVE' | 'VERIFY' | 'REJECT' | 'VOID' | 'MARK_PAID',
    extra: { reason?: string; paymentMethod?: EventPaymentMethod } = {},
    success = 'Updated'
  ) {
    setBusy(true);
    try {
      await eventEntryAction(eventId, txn.transactionId, action, extra);
      toast(success, 'success');
      setActiveTxn(null);
      setReasonFor(null);
      setPaidMethod(null);
      await refreshAll();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update this entry'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    try {
      const res = await remindPendingEventContributions(eventId);
      const extra = [
        res.skippedRecentlyRemindedCount ? `${res.skippedRecentlyRemindedCount} reminded in the last 24h` : '',
        res.skippedNoAppCount ? `${res.skippedNoAppCount} not on the app` : '',
      ].filter(Boolean);
      toast(`Reminder sent to ${res.sentCount}${extra.length ? ` · ${extra.join(' · ')}` : ''}`, 'success');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not send reminders'), 'error');
    }
  }

  async function applyBulk() {
    const value = Number(bulkAmount);
    if (!Number.isFinite(value) || value < 0) {
      toast('Enter an amount (0 makes flats exempt).', 'warning');
      return;
    }
    setBusy(true);
    try {
      const res = await setEventContributionAmount(eventId, { amount: value, applyTo: bulkApplyTo });
      toast(`Amount set for ${res.updatedCount} flat(s)`, 'success');
      setBulkOpen(false);
      await refreshAll();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not update amounts'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function closeEvent() {
    setMenuOpen(false);
    if (attention > 0) {
      toast(`Resolve ${attention} entr${attention === 1 ? 'y' : 'ies'} waiting for review before closing.`, 'warning');
      setTab('ledger');
      setLedgerView('PENDING');
      return;
    }
    confirm({
      title: `Close ${ev.name}?`,
      message:
        `Income ${formatInr(ev.totals.collected)}\nExpense ${formatInr(ev.totals.spent)}\nBalance ${formatInr(ev.totals.balance)}` +
        (ev.contributionRequired ? `\nPending contributions ${formatInr(ev.totals.pendingContribution)}` : '') +
        (ev.workQueue.billsToPay > 0 ? `\nUnpaid bills ${formatInr(ev.workQueue.billsToPay)}` : '') +
        '\n\nRecords will be locked. Members get the final summary.',
      confirmText: 'Close event',
      onConfirm: async () => {
        try {
          setDetail(await closeSocietyEvent(eventId, true));
          toast('Event closed', 'success');
          onChanged?.();
        } catch (err) {
          toast(apiErrorMessage(err, 'Could not close the event'), 'error');
        }
      },
    });
  }

  function reopenEvent() {
    setMenuOpen(false);
    confirm({
      title: 'Reopen event?',
      message: 'Entries can be changed again until you close it. This is recorded in the activity log.',
      confirmText: 'Reopen',
      onConfirm: async () => {
        try {
          setDetail(await reopenSocietyEvent(eventId));
          toast('Event reopened', 'success');
          onChanged?.();
        } catch (err) {
          toast(apiErrorMessage(err, 'Could not reopen'), 'error');
        }
      },
    });
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.pageBg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onPullRefresh()} />}
        keyboardShouldPersistTaps="handled"
      >
        <BackBar onBack={onBack} onMenu={() => setMenuOpen(true)} />

        {/* Hero: balance first, then in / out */}
        <LinearGradient colors={['#1e3a8a', '#1d4ed8', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName} numberOfLines={2}>
                {ev.name}
              </Text>
              <Text style={styles.heroMeta}>
                {eventTypeLabel(ev)}
                {ev.startDate ? ` · ${dateRange(ev.startDate, ev.endDate)}` : ''}
              </Text>
            </View>
            <View style={styles.heroPhase}>
              <Text style={styles.heroPhaseText}>{phaseLabel(ev.phase)}</Text>
            </View>
          </View>
          <Text style={styles.heroLabel}>Balance</Text>
          <Text style={styles.heroBalance}>{formatInr(ev.totals.balance)}</Text>
          <View style={styles.heroRow}>
            <HeroStat icon="arrow-down" label="Collected" value={formatInr(ev.totals.collected)} />
            <HeroStat icon="arrow-up" label="Spent" value={formatInr(ev.totals.spent)} />
            <HeroStat
              icon="time-outline"
              label={voluntary ? 'Expected' : 'Pending'}
              value={formatInr(voluntary ? ev.totals.expected : ev.totals.pendingContribution)}
            />
          </View>
        </LinearGradient>

        {ev.status === 'CLOSED' ? (
          <Banner icon="lock-closed-outline" tone="neutral" text="Closed — records are locked and kept for viewing." />
        ) : attention > 0 ? (
          <Pressable
            onPress={() => {
              setTab('ledger');
              setLedgerView('PENDING');
            }}
            accessibilityRole="button"
          >
            <Banner
              icon="notifications-outline"
              tone="warn"
              text={[
                ev.workQueue.toVerifyCount ? `${ev.workQueue.toVerifyCount} payment(s) to verify` : '',
                ev.workQueue.pendingApprovalCount && perms.canApprove
                  ? `${ev.workQueue.pendingApprovalCount} expense(s) to approve`
                  : '',
              ]
                .filter(Boolean)
                .join(' · ') || `${attention} item(s) waiting for review`}
              action="Review"
            />
          </Pressable>
        ) : null}

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.chipBg }]} accessibilityRole="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['flats', 'Flats'],
              ['ledger', 'Transactions'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              style={[styles.tab, tab === value ? { backgroundColor: theme.cardBg } : null]}
            >
              <Text style={[styles.tabText, { color: tab === value ? theme.text : theme.textMuted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            {perms.canRecord ? (
              <View style={styles.quick}>
                <QuickAction icon="home-outline" label="Contribution" color={IN_COLOR} onPress={() => openEntry('CONTRIBUTION')} />
                <QuickAction icon="add-circle-outline" label="Income" color={IN_COLOR} onPress={() => openEntry('INCOME')} />
                <QuickAction icon="cart-outline" label="Expense" color="#dc2626" onPress={() => openEntry('EXPENSE')} />
                {!voluntary && ev.totals.pendingCount + ev.totals.partialCount > 0 ? (
                  <QuickAction icon="notifications-outline" label="Remind" color={theme.accent} onPress={() => void remind()} />
                ) : null}
              </View>
            ) : null}

            <SectionCard
              title="Contribution progress"
              subtitle={`${ev.totals.paidCount} of ${Math.max(0, ev.totals.flatCount - ev.totals.exemptCount)} flats paid`}
            >
              <View style={[styles.progressTrack, { backgroundColor: theme.chipBg }]}>
                <View style={[styles.progressFill, { width: `${ev.totals.collectionProgress}%` }]} />
              </View>
              <View style={styles.legend}>
                <Legend color={IN_COLOR} text={`${ev.totals.paidCount} paid`} />
                <Legend color="#d97706" text={`${ev.totals.partialCount} part`} />
                <Legend color="#dc2626" text={`${ev.totals.pendingCount} ${voluntary ? 'not yet' : 'pending'}`} />
                <Text style={[styles.legendPct, { color: theme.text }]}>{ev.totals.collectionProgress}%</Text>
              </View>
            </SectionCard>

            <SectionCard title="Where money came from">
              {incomeLines.length === 0 ? (
                <Text style={{ color: theme.textMuted }}>No collections yet.</Text>
              ) : (
                <View style={styles.bars}>
                  {incomeLines.map((line) => (
                    <AmountBar
                      key={line.label}
                      label={line.label}
                      amount={formatInr(line.amount)}
                      percent={(line.amount / incomeMax) * 100}
                      color={IN_COLOR}
                    />
                  ))}
                </View>
              )}
            </SectionCard>

            <SectionCard title="Where money went">
              {ev.expenseByCategory.length === 0 ? (
                <Text style={{ color: theme.textMuted }}>No expenses yet.</Text>
              ) : (
                <View style={styles.bars}>
                  {ev.expenseByCategory.map((line) => (
                    <AmountBar
                      key={line.categoryCode}
                      label={line.label}
                      amount={formatInr(line.amount)}
                      percent={(line.amount / expenseMax) * 100}
                      color={OUT_COLOR}
                    />
                  ))}
                </View>
              )}
            </SectionCard>

            {ev.budget.items.length > 0 ? (
              <SectionCard
                title="Budget"
                subtitle={`${formatInr(ev.budget.used)} of ${formatInr(ev.budget.total)} used`}
              >
                <View style={styles.bars}>
                  {ev.budget.items.map((line) => (
                    <AmountBar
                      key={line.categoryCode}
                      label={line.label}
                      amount={`${compactInr(line.used)} / ${compactInr(line.budget)}`}
                      percent={line.usedPercent}
                      color={line.alert === 'OVER' ? '#dc2626' : line.alert === 'NEAR' ? '#d97706' : theme.accent}
                      trailing={line.alert !== 'OK' ? <Badge label={line.alert === 'OVER' ? 'Over' : '90%+'} tone="warn" /> : null}
                    />
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {!voluntary && ev.topPending.length > 0 ? (
              <SectionCard
                title="Pending contributions"
                headerRight={
                  <Pressable onPress={() => { setFlatFilter('PENDING'); setTab('flats'); }} hitSlop={8}>
                    <Text style={[styles.link, { color: theme.accent }]}>All flats</Text>
                  </Pressable>
                }
              >
                {ev.topPending.map((row, index) => (
                  <View
                    key={row.contributionId}
                    style={[styles.listRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider } : null]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: theme.text }]}>{row.flatNumber}</Text>
                      <Text style={[styles.rowSub, { color: theme.textMuted }]}>{row.memberName ?? 'Vacant'}</Text>
                    </View>
                    <Text style={[styles.rowAmount, { color: '#d97706' }]}>{formatInr(row.remaining)}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            <SectionCard
              title="Recent transactions"
              headerRight={
                <Pressable onPress={() => setTab('ledger')} hitSlop={8}>
                  <Text style={[styles.link, { color: theme.accent }]}>View all</Text>
                </Pressable>
              }
            >
              {ev.recentTransactions.length === 0 ? (
                <Text style={{ color: theme.textMuted }}>Nothing recorded yet.</Text>
              ) : (
                ev.recentTransactions.map((txn, index) => (
                  <TxnRow key={txn.transactionId} txn={txn} first={index === 0} onPress={() => setActiveTxn(txn)} />
                ))
              )}
            </SectionCard>

            {ev.committee.length > 0 ? (
              <SectionCard title="Committee">
                <View style={styles.people}>
                  {ev.committee.map((person) => (
                    <View key={person.memberId} style={[styles.person, { backgroundColor: theme.chipBg }]}>
                      <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                        <Text style={styles.avatarText}>{person.name.charAt(0)}</Text>
                      </View>
                      <Text style={[styles.personText, { color: theme.text }]}>
                        {person.name} <Text style={{ color: theme.textMuted }}>{person.flatNumber}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </>
        ) : null}

        {tab === 'flats' ? (
          <>
            <SheetInput value={flatQuery} onChangeText={setFlatQuery} placeholder="Search flat or name" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <ChipRow<FlatFilter>
                options={[
                  { label: `All ${contributions.length}`, value: 'ALL' },
                  { label: voluntary ? 'Not yet' : 'Pending', value: 'PENDING' },
                  { label: 'Part paid', value: 'PARTIAL' },
                  { label: 'Paid', value: 'PAID' },
                  { label: 'Exempt', value: 'EXEMPT' },
                ]}
                value={flatFilter}
                onChange={setFlatFilter}
              />
            </ScrollView>
            {perms.canEdit ? (
              <Pressable
                onPress={() => {
                  setBulkAmount(ev.defaultContributionAmount ? String(ev.defaultContributionAmount) : '');
                  setBulkOpen(true);
                }}
                style={[styles.outlineBtn, { borderColor: theme.accent }]}
                accessibilityRole="button"
              >
                <Ionicons name="options-outline" size={16} color={theme.accent} />
                <Text style={[styles.outlineBtnText, { color: theme.accent }]}>Set amount for all flats</Text>
              </Pressable>
            ) : null}
            <View style={[styles.listCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              {visibleFlats.length === 0 ? (
                <ListEmpty
                  title={contributions.length === 0 ? 'No flat amounts yet' : 'No flats match'}
                  subtitle={contributions.length === 0 ? 'Set an amount for all flats to start tracking.' : undefined}
                  icon="users"
                />
              ) : (
                visibleFlats.map((row, index) => {
                  const canRecord = perms.canRecord && row.status !== 'EXEMPT' && (voluntary || row.remaining > 0);
                  return (
                    <Pressable
                      key={row.flatId}
                      disabled={!canRecord}
                      onPress={() => openEntry('CONTRIBUTION', row.flatId)}
                      style={({ pressed }) => [
                        styles.flatRow,
                        index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider } : null,
                        pressed ? { backgroundColor: theme.chipBg } : null,
                      ]}
                      accessibilityHint={canRecord ? 'Record a payment for this flat' : undefined}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>{row.flatNumber}</Text>
                        <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
                          {row.memberName ?? 'Vacant'}
                          {row.pendingVerification > 0 ? ` · ${compactInr(row.pendingVerification)} to verify` : ''}
                        </Text>
                      </View>
                      <View style={styles.flatRight}>
                        <Text style={[styles.rowAmount, { color: theme.text }]}>
                          {compactInr(row.paid)}
                          <Text style={{ color: theme.textMuted, fontWeight: '500' }}> / {compactInr(row.expected)}</Text>
                        </Text>
                        <Badge label={contributionLabel(row.status, voluntary)} tone={contributionTone(row.status)} />
                      </View>
                      {canRecord ? <Ionicons name="add-circle" size={24} color={theme.accent} /> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          </>
        ) : null}

        {tab === 'ledger' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <ChipRow<LedgerView>
                options={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Money in', value: 'INCOME' },
                  { label: 'Money out', value: 'EXPENSE' },
                  { label: 'Needs action', value: 'PENDING' },
                ]}
                value={ledgerView}
                onChange={setLedgerView}
              />
            </ScrollView>
            <View style={[styles.listCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              {ledger.length === 0 ? (
                <ListEmpty title="No transactions" icon="document" />
              ) : (
                ledger.map((txn, index) => (
                  <TxnRow key={txn.transactionId} txn={txn} first={index === 0} onPress={() => setActiveTxn(txn)} showStatus />
                ))
              )}
            </View>
            {ledgerHasMore ? (
              <Pressable onPress={() => void loadLedger(ledgerPage + 1, ledgerView)} style={styles.loadMore}>
                <Text style={[styles.link, { color: theme.accent }]}>Load more</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {perms.canRecord ? (
        <Pressable
          onPress={() => openEntry(tab === 'ledger' && ledgerView === 'EXPENSE' ? 'EXPENSE' : 'CONTRIBUTION')}
          style={[styles.fab, { backgroundColor: theme.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Add money entry"
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <EventEntrySheet
        visible={entryOpen}
        eventId={eventId}
        initialKind={entryKind}
        presetFlatId={entryFlatId}
        contributions={contributions}
        categories={categories}
        isStaff={perms.isStaff}
        voluntary={voluntary}
        onClose={() => setEntryOpen(false)}
        onSaved={() => void refreshAll()}
      />

      {/* Menu: reports + lifecycle */}
      <EventSheet visible={menuOpen} title={ev.name} subtitle="Reports & actions" onClose={() => setMenuOpen(false)}>
        {REPORTS.map((report) => (
          <MenuRow key={report.value} icon={report.icon} label={report.label} hint="Share PDF" onPress={() => void shareReport(report.value)} />
        ))}
        {perms.canClose ? <MenuRow icon="lock-closed-outline" label="Close event" onPress={closeEvent} /> : null}
        {perms.canReopen ? <MenuRow icon="lock-open-outline" label="Reopen event" onPress={reopenEvent} /> : null}
      </EventSheet>

      {/* Transaction actions */}
      <EventSheet
        visible={activeTxn !== null && reasonFor === null && paidMethod === null}
        title={activeTxn ? `${activeTxn.direction === 'OUT' ? '−' : '+'}${formatInr(activeTxn.amount)}` : ''}
        subtitle={activeTxn ? txnTitle(activeTxn) : ''}
        onClose={() => setActiveTxn(null)}
      >
        {activeTxn ? (
          <>
            <View style={[styles.detailBox, { backgroundColor: theme.chipBg }]}>
              <DetailLine label="Status" value={activeTxn.voided ? 'Void' : entryStatusLabel(activeTxn.status)} />
              <DetailLine label="Date" value={shortDate(activeTxn.txnDate)} />
              <DetailLine label="Category" value={activeTxn.categoryLabel} />
              <DetailLine label="Method" value={paymentMethodLabel(activeTxn.paymentMethod)} />
              {activeTxn.referenceNo ? <DetailLine label="Reference" value={activeTxn.referenceNo} /> : null}
              {activeTxn.description ? <DetailLine label="Note" value={activeTxn.description} /> : null}
              <DetailLine label="Recorded by" value={activeTxn.recordedByName ?? '—'} />
              {activeTxn.voidReason ? <DetailLine label="Void reason" value={activeTxn.voidReason} /> : null}
              {activeTxn.reviewNote ? <DetailLine label="Review note" value={activeTxn.reviewNote} /> : null}
            </View>
            {Array.from({ length: activeTxn.attachmentCount }, (_, i) => (
              <MenuRow key={i} icon="document-attach-outline" label={`Open receipt ${i + 1}`} onPress={() => void openReceipt(activeTxn, i)} />
            ))}
            {activeTxn.canApprove ? (
              <MenuRow icon="checkmark-circle-outline" label="Approve expense" color={IN_COLOR} onPress={() => void runAction(activeTxn, 'APPROVE', {}, 'Approved')} />
            ) : null}
            {activeTxn.canVerify ? (
              <MenuRow icon="shield-checkmark-outline" label="Verify payment" color={IN_COLOR} onPress={() => void runAction(activeTxn, 'VERIFY', {}, 'Payment verified')} />
            ) : null}
            {activeTxn.canApprove || activeTxn.canVerify ? (
              <MenuRow icon="close-circle-outline" label="Reject" color={theme.danger} onPress={() => { setReason(''); setReasonFor('REJECT'); }} />
            ) : null}
            {activeTxn.canMarkPaid ? (
              <MenuRow icon="cash-outline" label="Mark bill as paid" onPress={() => setPaidMethod('CASH')} />
            ) : null}
            {activeTxn.canVoid ? (
              <MenuRow icon="ban-outline" label="Void entry" color={theme.danger} onPress={() => { setReason(''); setReasonFor('VOID'); }} />
            ) : null}
          </>
        ) : null}
      </EventSheet>

      {/* Reason for void / reject */}
      <EventSheet
        visible={reasonFor !== null}
        title={reasonFor === 'VOID' ? 'Void entry' : 'Reject entry'}
        subtitle={
          reasonFor === 'VOID'
            ? 'Removed from totals, kept in history for transparency.'
            : 'The person who added it will see your reason.'
        }
        onClose={() => setReasonFor(null)}
        footer={
          <SheetButtons
            onCancel={() => setReasonFor(null)}
            onSave={() => {
              if (!activeTxn || !reasonFor) return;
              if (!reason.trim()) {
                toast('Please write a short reason.', 'warning');
                return;
              }
              void runAction(activeTxn, reasonFor, { reason: reason.trim() }, reasonFor === 'VOID' ? 'Entry voided' : 'Entry rejected');
            }}
            saving={busy}
            saveLabel={reasonFor === 'VOID' ? 'Void' : 'Reject'}
            destructive
          />
        }
      >
        <SheetField label="Reason">
          <SheetInput value={reason} onChangeText={setReason} placeholder={reasonFor === 'VOID' ? 'e.g. Entered twice' : 'e.g. Bill not provided'} maxLength={300} autoFocus />
        </SheetField>
      </EventSheet>

      {/* Mark paid */}
      <EventSheet
        visible={paidMethod !== null}
        title="Mark bill as paid"
        subtitle={activeTxn ? `${txnTitle(activeTxn)} · ${formatInr(activeTxn.amount)}` : ''}
        onClose={() => setPaidMethod(null)}
        footer={
          <SheetButtons
            onCancel={() => setPaidMethod(null)}
            onSave={() => activeTxn && paidMethod && void runAction(activeTxn, 'MARK_PAID', { paymentMethod: paidMethod }, 'Marked as paid')}
            saving={busy}
            saveLabel="Mark paid"
          />
        }
      >
        <SheetField label="Paid by">
          <ChipRow options={PAYMENT_METHODS} value={paidMethod} onChange={setPaidMethod} />
        </SheetField>
      </EventSheet>

      {/* Bulk amount */}
      <EventSheet
        visible={bulkOpen}
        title="Set contribution amount"
        subtitle="Change individual flats later from the list. ₹0 = exempt."
        onClose={() => setBulkOpen(false)}
        footer={<SheetButtons onCancel={() => setBulkOpen(false)} onSave={() => void applyBulk()} saving={busy} saveLabel="Apply" />}
      >
        <SheetField label="Amount per flat">
          <SheetInput large value={bulkAmount} onChangeText={(t) => setBulkAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="₹ 300" />
        </SheetField>
        <SheetField label="Apply to">
          <ChipRow
            options={[
              { label: 'Occupied flats', value: 'OCCUPIED_FLATS' },
              { label: 'All flats', value: 'ALL_FLATS' },
            ]}
            value={bulkApplyTo}
            onChange={setBulkApplyTo}
          />
        </SheetField>
      </EventSheet>
    </View>
  );
}

function txnTitle(txn: EventTransaction): string {
  if (txn.flatNumber) return `Flat ${txn.flatNumber}`;
  return txn.partyName || txn.categoryLabel;
}

function BackBar({ onBack, onMenu }: { onBack: () => void; onMenu?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to events">
        <Ionicons name="chevron-back" size={22} color={theme.accent} />
        <Text style={[styles.backText, { color: theme.accent }]}>Events</Text>
      </Pressable>
      {onMenu ? (
        <Pressable onPress={onMenu} hitSlop={10} style={[styles.menuBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} accessibilityRole="button" accessibilityLabel="Reports and actions">
          <Ionicons name="document-text-outline" size={16} color={theme.text} />
          <Text style={[styles.menuText, { color: theme.text }]}>Reports</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HeroStat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatLabelRow}>
        <Ionicons name={icon} size={12} color="rgba(255,255,255,0.75)" />
        <Text style={styles.heroStatLabel}>{label}</Text>
      </View>
      <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Banner({ icon, text, tone, action }: { icon: keyof typeof Ionicons.glyphMap; text: string; tone: 'warn' | 'neutral'; action?: string }) {
  const { theme } = useTheme();
  const warn = tone === 'warn';
  return (
    <View style={[styles.banner, { backgroundColor: warn ? '#fef3c7' : theme.chipBg }]}>
      <Ionicons name={icon} size={18} color={warn ? '#92400e' : theme.textSoft} />
      <Text style={[styles.bannerText, { color: warn ? '#92400e' : theme.textSoft }]}>{text}</Text>
      {action ? <Text style={styles.bannerAction}>{action} ›</Text> : null}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quickBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}1a` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.quickText, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.textSoft }]}>{text}</Text>
    </View>
  );
}

function TxnRow({ txn, first, onPress, showStatus }: { txn: EventTransaction; first: boolean; onPress: () => void; showStatus?: boolean }) {
  const { theme } = useTheme();
  const out = txn.direction === 'OUT';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.txnRow,
        !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider } : null,
        pressed ? { backgroundColor: theme.chipBg } : null,
        txn.voided ? { opacity: 0.5 } : null,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.txnIcon, { backgroundColor: out ? '#fee2e2' : '#dcfce7' }]}>
        <Ionicons name={out ? 'arrow-up' : 'arrow-down'} size={16} color={out ? '#dc2626' : IN_COLOR} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: theme.text, textDecorationLine: txn.voided ? 'line-through' : 'none' }]} numberOfLines={1}>
          {txnTitle(txn)}
        </Text>
        <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
          {txn.categoryLabel} · {shortDate(txn.txnDate)}
          {txn.attachmentCount > 0 ? ' · 📎' : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.rowAmount, { color: out ? '#dc2626' : IN_COLOR }]}>
          {out ? '−' : '+'}
          {compactInr(txn.amount)}
        </Text>
        {(showStatus || txn.status !== 'CONFIRMED' || txn.voided) && (txn.voided || txn.status !== 'CONFIRMED') ? (
          <Badge label={txn.voided ? 'Void' : entryStatusLabel(txn.status)} tone={txn.voided ? 'neutral' : txn.status === 'REJECTED' ? 'neutral' : 'warn'} />
        ) : null}
      </View>
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  color?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.menuRow, { borderColor: theme.cardBorder, backgroundColor: pressed ? theme.chipBg : 'transparent' }]}
    >
      <Ionicons name={icon} size={20} color={color ?? theme.accent} />
      <Text style={[styles.menuRowText, { color: color ?? theme.text }]}>{label}</Text>
      {hint ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{hint}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.detailLine}>
      <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 110, gap: 12 },
  backBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  menuText: { fontSize: 13, fontWeight: '700' },
  hero: { borderRadius: 22, padding: 18, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  heroMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  heroPhase: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroPhaseText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroBalance: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  heroRow: { flexDirection: 'row', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, gap: 8 },
  heroStat: { flex: 1, gap: 2 },
  heroStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, fontWeight: '600' },
  heroStatValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 13 },
  bannerText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  bannerAction: { color: '#92400e', fontWeight: '800', fontSize: 13.5 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  tabText: { fontSize: 14, fontWeight: '700' },
  quick: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: IN_COLOR },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12.5 },
  legendPct: { marginLeft: 'auto', fontWeight: '800', fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bars: { gap: 12 },
  link: { fontSize: 14, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12.5, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '800' },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  personText: { fontSize: 13.5, fontWeight: '600' },
  filterRow: { paddingVertical: 2 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  listCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  flatRight: { alignItems: 'flex-end', gap: 4 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  txnIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  loadMore: { alignItems: 'center', paddingVertical: 12 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 6 },
      default: {},
    }) as object),
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  menuRowText: { flex: 1, fontSize: 15, fontWeight: '700' },
  detailBox: { borderRadius: 14, padding: 14, gap: 8 },
  detailLine: { flexDirection: 'row', gap: 12 },
  detailLabel: { width: 96, fontSize: 13 },
  detailValue: { flex: 1, fontSize: 13.5, fontWeight: '600' },
});
