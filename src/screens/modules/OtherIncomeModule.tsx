import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { AddOtherIncomeModal } from '../../components/income/AddOtherIncomeModal';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchOtherIncomeHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function OtherIncomeModule() {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, loading, error, refreshing, refresh } = useAsyncLoad(fetchOtherIncomeHistory, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SectionCard
          title="Other Income History"
          subtitle="Transfer fees, amenity charges, parking, hall rent, and other incidental income"
          headerRight={
            <Pressable
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
              onPress={() => setModalOpen(true)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          }
        >
          {loading ? <ListLoading /> : null}
          {error ? <ListError message={error} /> : null}
          {data?.length === 0 ? <ListEmpty message="No other income entries yet." /> : null}
          {data?.map((row) => (
            <ExpenseRowCard key={row.expenseId} row={row} />
          ))}
        </SectionCard>
      </ScrollView>

      <AddOtherIncomeModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
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
