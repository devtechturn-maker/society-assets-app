import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookView, FlatStatementView } from '../../components/reports/AccountsViews';
import { YearEndView } from '../../components/reports/YearEndView';
import { REPORT_PERIODS, periodRange, type ReportPeriod } from '../../utils/reportPeriods';
import { Badge, paymentBadgeTone } from '../../components/dashboard/Badge';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ReportEmailForm } from '../../components/reports/ReportEmailForm';
import {
  fetchReportExpenseCategories,
  fetchReportMemberPending,
  fetchReportMonthlyMaintenance,
  fetchReportPaymentModes,
  fetchReportSummary,
} from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, formatInr } from '../../utils/format';
import { unitName } from '../../utils/unitName';

export function ReportsModule() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>('THIS_FY');
  const [open, setOpen] = useState<'book' | 'statement' | 'year' | null>(null);
  const [age, setAge] = useState<string>('ALL');
  const range = useMemo(() => periodRange(period), [period]);
  const summary = useAsyncLoad(() => fetchReportSummary(range), [range.from, range.to]);
  const monthly = useAsyncLoad(fetchReportMonthlyMaintenance, []);
  const categories = useAsyncLoad(() => fetchReportExpenseCategories(range), [range.from, range.to]);
  const modes = useAsyncLoad(() => fetchReportPaymentModes(range), [range.from, range.to]);
  const memberPending = useAsyncLoad(fetchReportMemberPending, []);

  const refreshing =
    summary.refreshing ||
    monthly.refreshing ||
    categories.refreshing ||
    modes.refreshing ||
    memberPending.refreshing;

  const pageLoading =
    (summary.loading && !summary.data) ||
    (monthly.loading && !monthly.data) ||
    (categories.loading && !categories.data) ||
    (modes.loading && !modes.data) ||
    (memberPending.loading && !memberPending.data);

  function refreshAll() {
    summary.refresh();
    monthly.refresh();
    categories.refresh();
    modes.refresh();
    memberPending.refresh();
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
    >
      <View style={styles.periods}>
        {REPORT_PERIODS.map((p) => {
          const on = p.value === period;
          return (
            <Pressable
              key={p.value}
              onPress={() => setPeriod(p.value)}
              style={[
                styles.period,
                { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : theme.cardBg },
              ]}
            >
              <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 13 }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.meta, { color: theme.textMuted, marginBottom: 8 }]}>
        Money is counted on the date it was received or paid. Pending is always what is owed today.
      </Text>
      {pageLoading ? <ListLoading /> : null}

      {!pageLoading && summary.error ? <ListError message={summary.error} /> : null}
      {!pageLoading && summary.data ? (
        <KpiGrid
          items={[
            { label: 'Maintenance Collected', value: summary.data.totalMaintenanceCollected },
            { label: 'Other Income', value: summary.data.totalOtherIncome ?? 0 },
            { label: 'Expense Outflow', value: summary.data.totalExpenseOutflow },
            { label: 'Net Balance', value: summary.data.netBalance },
            ...(summary.data.openingBalance !== undefined && summary.data.closingBalance !== undefined
              ? [
                  { label: 'Opening Balance', value: summary.data.openingBalance },
                  { label: 'Closing Balance', value: summary.data.closingBalance },
                ]
              : []),
            { label: 'Penalty Collected', value: summary.data.totalPenaltyCollected },
            { label: 'Total Pending', value: summary.data.totalPending },
          ]}
        />
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Monthly Maintenance Report" subtitle="Month-wise collection, dues and pending">
          {monthly.error ? <ListError message={monthly.error} /> : null}
          {monthly.data?.length === 0 ? <ListEmpty message="No monthly data." /> : null}
          {monthly.data?.map((r) => (
            <View key={r.month} style={[styles.row, { borderTopColor: theme.divider }]}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{r.month}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                Collected {formatInr(r.collected)} · Pending {formatInr(r.pending)}
              </Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Expense Category Report">
          {categories.data?.map((r) => (
            <View key={r.category} style={[styles.row, { borderTopColor: theme.divider }]}>
              <Badge label={r.label ?? r.category} tone="info" />
              <Text style={[styles.amount, { color: theme.text }]}>{formatInr(r.amount)}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {!pageLoading && modes.data ? (
        <KpiGrid
          items={[
            { label: 'Cash In', value: modes.data.cashIn },
            { label: 'Online In', value: modes.data.onlineIn },
            { label: 'Cash Out', value: modes.data.cashOut },
            { label: 'Online Out', value: modes.data.onlineOut },
          ]}
        />
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Defaulters / Member Pending" subtitle="How long each flat has been late">
          <View style={styles.periods}>
            {['ALL', '0-30', '31-60', '61-90', '90+'].map((g) => {
              const on = g === age;
              const count = g === 'ALL' ? memberPending.data?.length ?? 0
                : memberPending.data?.filter((r) => r.ageGroup === g).length ?? 0;
              return (
                <Pressable
                  key={g}
                  onPress={() => setAge(g)}
                  style={[
                    styles.period,
                    { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : theme.cardBg },
                  ]}
                >
                  <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 13 }}>
                    {g === 'ALL' ? 'All' : `${g} days`} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {memberPending.data?.filter((r) => age === 'ALL' || r.ageGroup === age).map((r) => (
            <View key={r.memberId} style={[styles.row, { borderTopColor: theme.divider }]}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{r.memberName}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                {unitName(r.flatNumber)} · Pending {formatInr(r.remainingDueAmount)}
              </Text>
              {r.daysOverdue !== undefined && r.daysOverdue > 0 ? (
                <Text style={[styles.meta, { color: r.daysOverdue > 90 ? '#b91c1c' : '#b45309', fontWeight: '700' }]}>
                  {r.daysOverdue} days late{r.oldestUnpaidMonth ? ` · since ${r.oldestUnpaidMonth}` : ''}
                </Text>
              ) : null}
              <Badge label={r.lastPaymentType || '—'} tone={paymentBadgeTone(r.lastPaymentType)} />
              <Text style={[styles.meta, { color: theme.textSoft }]}>{formatDate(r.lastPaymentDate)}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Cash & Bank Book" subtitle="Every entry with a running balance, for the dates above">
          {open === 'book' ? (
            <BookView range={range} />
          ) : (
            <Pressable onPress={() => setOpen('book')}>
              <Text style={[styles.open, { color: theme.accent }]}>Open cash & bank book</Text>
            </Pressable>
          )}
        </SectionCard>
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Flat Statement" subtitle="One flat's bills, payments and balance, to share with the member">
          {open === 'statement' ? (
            <FlatStatementView />
          ) : (
            <Pressable onPress={() => setOpen('statement')}>
              <Text style={[styles.open, { color: theme.accent }]}>Open flat statement</Text>
            </Pressable>
          )}
        </SectionCard>
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Year End" subtitle="Receipts & Payments, Income & Expenditure, and closing the year after audit">
          {open === 'year' ? (
            <YearEndView />
          ) : (
            <Pressable onPress={() => setOpen('year')}>
              <Text style={[styles.open, { color: theme.accent }]}>Open year end</Text>
            </Pressable>
          )}
        </SectionCard>
      ) : null}

      {!pageLoading ? <ReportEmailForm /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 24 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  period: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  open: { fontWeight: '800', paddingVertical: 8 },
  row: {
    borderTopWidth: 1,
    paddingVertical: 10,
    gap: 4,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700', marginTop: 4 },
});
