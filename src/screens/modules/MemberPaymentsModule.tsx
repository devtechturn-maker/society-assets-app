import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { SubmissionRow, inr } from '../../components/payment/MaintenancePayment';
import { useAppAlert } from '../../context/AppAlertContext';
import {
  approveMemberPayment,
  fetchMemberPayments,
  officePaymentScreenshotPath,
  rejectMemberPayment,
} from '../../services/api';
import type { MaintenancePaymentSubmission } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';

type Tab = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

const TABS: { key: Tab; label: string }[] = [
  { key: 'PENDING_REVIEW', label: 'To verify' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

/**
 * Society office: maintenance payments members submitted with a screenshot. The chairman, treasurer and committee
 * approve (recorded as maintenance) or reject (with a reason the member sees); auditors can only look.
 */
export function MemberPaymentsModule() {
  const { theme } = useTheme();
  const { alert, confirm } = useAppAlert();
  const [tab, setTab] = useState<Tab>('PENDING_REVIEW');
  const [items, setItems] = useState<MaintenancePaymentSubmission[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<MaintenancePaymentSubmission | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const page = await fetchMemberPayments({ status: tab, size: 50 });
        setItems(page.items);
        setCanReview(page.canReview === true);
        setError(null);
      } catch (e) {
        setError(apiErrorMessage(e, 'Could not load payments'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    void load();
  }, [load]);

  function approve(item: MaintenancePaymentSubmission) {
    confirm({
      title: 'Approve this payment?',
      message: `${inr(item.amount)} from flat ${item.flatNumber} (ref ${item.referenceNo}) will be recorded as maintenance and a receipt emailed. Check that the screenshot and your bank statement match first.`,
      confirmText: 'Approve',
      onConfirm: async () => {
        setBusyId(item.id);
        try {
          await approveMemberPayment(item.id);
          alert('Approved', 'The payment is recorded and the member has been notified.', { variant: 'success' });
          void load('refresh');
        } catch (e) {
          alert('Could not approve', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  async function submitReject() {
    if (!rejecting) return;
    const why = reason.trim();
    if (why.length < 3) {
      alert('Reason needed', 'Tell the member why the payment was not accepted.', { variant: 'error' });
      return;
    }
    setBusyId(rejecting.id);
    try {
      await rejectMemberPayment(rejecting.id, why);
      setRejecting(null);
      setReason('');
      alert('Rejected', 'The member has been notified and can submit again.', { variant: 'success' });
      void load('refresh');
    } catch (e) {
      alert('Could not reject', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.tabs, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, on ? { borderBottomColor: theme.accent } : null]}>
              <Text style={{ color: on ? theme.text : theme.textMuted, fontWeight: on ? '800' : '600' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
      >
        {tab === 'PENDING_REVIEW' ? (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Members paid these into the society's bank account. Tap the screenshot to enlarge it, check it against your bank
            statement, then approve or reject.
          </Text>
        ) : null}
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
        {error ? <ListError message={error} /> : null}
        {!loading && !error && items.length === 0 ? (
          <ListEmpty
            icon="wallet"
            message={tab === 'PENDING_REVIEW' ? 'No payments waiting for verification.' : 'Nothing here yet.'}
          />
        ) : null}
        {items.map((item) => (
          <SubmissionRow key={item.id} item={item} screenshotPath={officePaymentScreenshotPath(item.id)} showFlat>
            {canReview && item.status === 'PENDING_REVIEW' ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setReason('');
                    setRejecting(item);
                  }}
                  disabled={busyId === item.id}
                  style={[styles.secondary, { borderColor: '#b91c1c' }]}
                >
                  <Text style={{ color: '#b91c1c', fontWeight: '800' }}>Reject</Text>
                </Pressable>
                <Pressable
                  onPress={() => approve(item)}
                  disabled={busyId === item.id}
                  style={[styles.approve, { opacity: busyId === item.id ? 0.6 : 1 }]}
                >
                  {busyId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveText}>Approve</Text>}
                </Pressable>
              </View>
            ) : null}
          </SubmissionRow>
        ))}
      </ScrollView>

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.dialog, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Reject payment</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {rejecting ? `Flat ${rejecting.flatNumber}, ${inr(rejecting.amount)}, ref ${rejecting.referenceNo}. ` : ''}
              The member sees this reason and can submit again.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Amount not received in the society account"
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={500}
              autoFocus
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setRejecting(null)} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitReject()} disabled={!!busyId} style={[styles.approve, { backgroundColor: '#b91c1c' }]}>
                {busyId ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveText}>Reject</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  content: { padding: 12, paddingBottom: 40, gap: 10 },
  hint: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  approve: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#15803d', minHeight: 44, justifyContent: 'center' },
  approveText: { color: '#fff', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { borderRadius: 18, padding: 18, gap: 10 },
  dialogTitle: { fontSize: 17, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
});
