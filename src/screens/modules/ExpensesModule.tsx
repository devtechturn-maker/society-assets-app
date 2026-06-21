import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { AddExpenseModal } from '../../components/expenses/AddExpenseModal';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchExpenseHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function ExpensesModule() {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const expenses = useAsyncLoad(fetchExpenseHistory, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={expenses.refreshing} onRefresh={expenses.refresh} />}
      >
        <SectionCard
          title="Expense History"
          subtitle="Latest non-maintenance expenses for this society"
          headerRight={
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              onPress={() => setModalOpen(true)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          }
        >
          {expenses.loading ? <ListLoading /> : null}
          {expenses.error ? <ListError message={expenses.error} /> : null}
          {expenses.data?.length === 0 ? <ListEmpty message="No expenses recorded." /> : null}
          {expenses.data?.map((row) => (
            <ExpenseRowCard key={row.expenseId} row={row} />
          ))}
        </SectionCard>
      </ScrollView>

      <AddExpenseModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          expenses.refresh();
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
