import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchMemberMaintenanceHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function MemberMaintenanceModule() {
  const { theme } = useTheme();
  const { data, loading, error, refreshing, refresh } = useAsyncLoad(
    fetchMemberMaintenanceHistory,
    []
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <SectionCard title="My maintenance" subtitle="Payments recorded for your flat">
        {loading ? <ListLoading /> : null}
        {error ? <ListError message={error} /> : null}
        {data?.length === 0 ? <ListEmpty message="No maintenance records yet." /> : null}
        {data?.map((row) => (
          <ExpenseRowCard key={row.expenseId} row={row} showMember={false} />
        ))}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
});
