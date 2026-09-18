import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { AddLedgerEntryModal } from '../../components/ledger/AddLedgerEntryModal';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchLedgerHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function IncomeExpensesModule() {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const ledger = useAsyncLoad(fetchLedgerHistory, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={ledger.refreshing} onRefresh={ledger.refresh} />}
      >
        <SectionCard
          title="Income & Expenses"
          subtitle="Society expenses and other income in one place — transfer fees, repairs, utilities, amenity charges, and more"
          headerRight={
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              onPress={() => setModalOpen(true)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          }
        >
          {ledger.loading ? <ListLoading /> : null}
          {ledger.error ? <ListError message={ledger.error} /> : null}
          {ledger.data?.length === 0 ? <ListEmpty message="No income or expense entries yet." /> : null}
          {ledger.data?.map((row) => (
            <ExpenseRowCard key={row.expenseId} row={row} showEntryType />
          ))}
        </SectionCard>
      </ScrollView>

      <AddLedgerEntryModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          ledger.refresh();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
