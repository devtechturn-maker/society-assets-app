import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { AddMaintenanceModal } from '../../components/maintenance/AddMaintenanceModal';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchMaintenanceHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function MaintenanceModule() {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, loading, error, refreshing, refresh } = useAsyncLoad(fetchMaintenanceHistory, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SectionCard
          title="Maintenance History"
          subtitle="Latest maintenance entries for this society"
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
          {data?.length === 0 ? <ListEmpty message="No maintenance entries yet." /> : null}
          {data?.map((row) => (
            <ExpenseRowCard key={row.expenseId} row={row} showMember={true} />
          ))}
        </SectionCard>
      </ScrollView>

      <AddMaintenanceModal
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
