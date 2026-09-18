import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddContractModal } from '../../components/contracts/AddContractModal';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { fetchContractTypes, fetchContracts } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, formatInr } from '../../utils/format';

export function ContractsModule() {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, loading, error, refreshing, refresh } = useAsyncLoad(fetchContracts, []);

  async function openAddContract() {
    try {
      const types = await fetchContractTypes();
      if (types.length === 0) {
        alert(
          'Contract types required',
          'Add at least one contract type under Services → Contract Types, then try again.',
          { variant: 'warning' }
        );
        return;
      }
      setModalOpen(true);
    } catch {
      alert('Error', 'Could not load contract types.', { variant: 'error' });
    }
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SectionCard
          title="Service contracts"
          subtitle="Contract types are managed in Services. Chairman receives email 7 days before expiry (08:00 IST)."
          headerRight={
            <Pressable style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={openAddContract}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          }
        >
          {loading ? <ListLoading /> : null}
          {error ? <ListError message={error} /> : null}
          {data?.length === 0 ? <ListEmpty message="No contracts yet." /> : null}
          {data?.map((c) => (
            <View key={c.id} style={[styles.card, { borderTopColor: theme.divider }]}>
              <Text style={[styles.type, { color: theme.text }]}>{c.contractType}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>Vendor: {c.vendorName || '—'}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                Reference: {c.referenceNote || '—'}
              </Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                {formatDate(c.startDate)} → {formatDate(c.endDate)}
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>{formatInr(c.contractValue)}</Text>
              <Text style={[styles.reminder, { color: theme.textMuted }]}>
                1-week mail sent: {c.weekBeforeExpiryReminderSent ? 'Yes' : 'No'}
              </Text>
            </View>
          ))}
        </SectionCard>
      </ScrollView>

      <AddContractModal
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
  card: {
    borderTopWidth: 1,
    paddingVertical: 12,
    gap: 4,
  },
  type: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
  value: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  reminder: { fontSize: 12 },
});
