import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchOverview, fetchRecentExpenses } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';

export function DashboardModule() {
  const overview = useAsyncLoad(fetchOverview, []);
  const recent = useAsyncLoad(fetchRecentExpenses, []);

  const refreshing = overview.refreshing || recent.refreshing;
  const pageLoading =
    (overview.loading && !overview.data) || (recent.loading && !recent.data);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            overview.refresh();
            recent.refresh();
          }}
        />
      }
    >
      {pageLoading ? <ListLoading /> : null}
      {overview.error ? <ListError message={overview.error} /> : null}
      {!pageLoading && overview.data ? (
        <KpiGrid
          items={[
            { label: 'Total Income', value: overview.data.totalIncome },
            { label: 'Other Income', value: overview.data.totalOtherIncome ?? 0 },
            { label: 'Total Expenses', value: overview.data.totalExpenses },
            { label: 'Cash On Hand', value: overview.data.cashOnHand },
            { label: 'Expense Count', value: overview.data.expenseCount, isCurrency: false },
            { label: 'Total Members', value: overview.data.totalUsers, isCurrency: false },
          ]}
        />
      ) : null}

      {!pageLoading ? (
        <SectionCard title="Recent 5 Expenses">
          {recent.error ? <ListError message={recent.error} /> : null}
          {recent.data?.length === 0 ? <ListEmpty message="No recent expenses." /> : null}
          {recent.data?.map((row) => <ExpenseRowCard key={row.expenseId} row={row} />)}
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
});
