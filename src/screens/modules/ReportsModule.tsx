import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export function ReportsModule() {
  const { theme } = useTheme();
  const summary = useAsyncLoad(fetchReportSummary, []);
  const monthly = useAsyncLoad(fetchReportMonthlyMaintenance, []);
  const categories = useAsyncLoad(fetchReportExpenseCategories, []);
  const modes = useAsyncLoad(fetchReportPaymentModes, []);
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
      {pageLoading ? <ListLoading /> : null}

      {!pageLoading && summary.error ? <ListError message={summary.error} /> : null}
      {!pageLoading && summary.data ? (
        <KpiGrid
          items={[
            { label: 'Maintenance Collected', value: summary.data.totalMaintenanceCollected },
            { label: 'Other Income', value: summary.data.totalOtherIncome ?? 0 },
            { label: 'Expense Outflow', value: summary.data.totalExpenseOutflow },
            { label: 'Net Balance', value: summary.data.netBalance },
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
              <Badge label={r.category} tone="info" />
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
        <SectionCard title="Member Pending Report">
          {memberPending.data?.map((r) => (
            <View key={r.memberId} style={[styles.row, { borderTopColor: theme.divider }]}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{r.memberName}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                Flat {r.flatNumber} · Pending {formatInr(r.remainingDueAmount)}
              </Text>
              <Badge label={r.lastPaymentType || '—'} tone={paymentBadgeTone(r.lastPaymentType)} />
              <Text style={[styles.meta, { color: theme.textSoft }]}>{formatDate(r.lastPaymentDate)}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {!pageLoading ? <ReportEmailForm /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 24 },
  row: {
    borderTopWidth: 1,
    paddingVertical: 10,
    gap: 4,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '700', marginTop: 4 },
});
