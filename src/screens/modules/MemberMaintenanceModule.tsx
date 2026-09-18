import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import axios from 'axios';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { PayMaintenanceButton } from '../../components/payment/PayMaintenanceButton';
import { useAppAlert } from '../../context/AppAlertContext';
import { fetchMemberMaintenanceDue, fetchMemberMaintenanceHistory } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import { openMemberMaintenanceReceipt } from '../../utils/maintenanceReceipt';

export function MemberMaintenanceModule() {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data, loading, error, refreshing, refresh } = useAsyncLoad(
    fetchMemberMaintenanceHistory,
    []
  );
  const due = useAsyncLoad(fetchMemberMaintenanceDue, []);

  const downloadReceipt = useCallback(
    async (expenseId: string) => {
      setDownloadingId(expenseId);
      try {
        await openMemberMaintenanceReceipt(expenseId);
      } catch (e) {
        const msg =
          axios.isAxiosError(e) && typeof e.response?.data === 'string'
            ? e.response.data
            : e instanceof Error
              ? e.message
              : 'Unable to download receipt.';
        alert('Receipt unavailable', msg, { variant: 'error' });
      } finally {
        setDownloadingId(null);
      }
    },
    [alert]
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || due.refreshing}
          onRefresh={() => {
            void refresh();
            void due.refresh();
          }}
        />
      }
    >
      <SectionCard
        title="My maintenance"
        subtitle="Payments recorded for your flat — download a receipt for any payment"
      >
        <PayMaintenanceButton
          compact
          due={due.data}
          onPaid={() => {
            void refresh();
            void due.refresh();
          }}
        />
        {loading ? <ListLoading /> : null}
        {error ? <ListError message={error} /> : null}
        {data?.length === 0 ? (
          <ListEmpty icon="wallet" message="No maintenance records yet." />
        ) : null}
        {data?.map((row) => {
          const isDownloading = downloadingId === row.expenseId;
          return (
            <ExpenseRowCard key={row.expenseId} row={row} showMember={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download maintenance receipt"
                disabled={isDownloading}
                onPress={() => downloadReceipt(row.expenseId)}
                style={({ pressed }) => [
                  styles.receiptBtn,
                  {
                    backgroundColor: theme.accent,
                    opacity: isDownloading || pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.receiptBtnText}>Download Receipt</Text>
                )}
              </Pressable>
            </ExpenseRowCard>
          );
        })}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  receiptBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 156,
    alignItems: 'center',
  },
  receiptBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
