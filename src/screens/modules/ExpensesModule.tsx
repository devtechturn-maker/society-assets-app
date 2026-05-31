import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddExpenseModal } from '../../components/expenses/AddExpenseModal';
import { Badge, paymentBadgeTone } from '../../components/dashboard/Badge';
import { ExpenseRowCard } from '../../components/dashboard/ExpenseRowCard';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import {
  fetchExpenseHistory,
  fetchMaintenancePending,
  sendPendingReminder,
} from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, formatInr } from '../../utils/format';

export function ExpensesModule() {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const pending = useAsyncLoad(fetchMaintenancePending, []);
  const expenses = useAsyncLoad(fetchExpenseHistory, []);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function onReminder(memberId: string) {
    setSendingId(memberId);
    try {
      await sendPendingReminder(memberId);
      alert('Reminder sent', 'Pending maintenance reminder email was sent.', { variant: 'success' });
    } catch (e: unknown) {
      alert('Failed', e instanceof Error ? e.message : 'Could not send reminder', { variant: 'error' });
    } finally {
      setSendingId(null);
    }
  }

  function refreshAll() {
    pending.refresh();
    expenses.refresh();
  }

  const refreshing = pending.refreshing || expenses.refreshing;

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      >
        <SectionCard
          title="Member Pending Summary (Audit View)"
          subtitle="Latest pending status by member for year-end audit"
        >
          {pending.loading ? <ListLoading /> : null}
          {pending.error ? <ListError message={pending.error} /> : null}
          {pending.data?.length === 0 ? <ListEmpty message="No pending maintenance." /> : null}
          {pending.data?.map((row) => (
            <View key={row.memberId} style={[styles.pendingCard, { borderTopColor: theme.divider }]}>
              <Text style={[styles.name, { color: theme.text }]}>{row.memberName}</Text>
              <Text style={[styles.email, { color: theme.textMuted }]}>{row.memberEmail}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>Flat {row.flatNumber}</Text>
              <Text style={[styles.meta, { color: theme.textSoft }]}>
                Pending {formatInr(row.remainingDueAmount)}
              </Text>
              <View style={styles.row}>
                <Badge label={row.lastPaymentType || '—'} tone={paymentBadgeTone(row.lastPaymentType)} />
                <Text style={[styles.meta, { color: theme.textSoft }]}>{formatDate(row.lastPaymentDate)}</Text>
              </View>
              <Pressable
                style={[
                  styles.reminderBtn,
                  { backgroundColor: theme.accent },
                  (row.remainingDueAmount ?? 0) <= 0 ? styles.disabled : null,
                ]}
                disabled={(row.remainingDueAmount ?? 0) <= 0 || sendingId === row.memberId}
                onPress={() => onReminder(row.memberId)}
              >
                <Text style={styles.reminderText}>
                  {sendingId === row.memberId ? 'Sending…' : 'Send Reminder'}
                </Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>

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
          refreshAll();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  pendingCard: {
    borderTopWidth: 1,
    paddingVertical: 12,
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 12 },
  meta: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reminderBtn: {
    marginTop: 8,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reminderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.45 },
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
