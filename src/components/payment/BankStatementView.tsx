import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { approveMatchedBankLines, fetchBankStatement, fetchBankStatements, uploadBankStatement } from '../../services/api';
import type { BankLineStatus, BankStatementDetail, BankStatementLine, BankStatementSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { AddMaintenanceModal } from '../maintenance/AddMaintenanceModal';
import { apiErrorMessage } from '../../utils/apiError';
import { formatDateTime, formatInr } from '../../utils/format';
import { unitName } from '../../utils/unitName';

const GROUPS: { status: BankLineStatus; title: string; color: string; hint: string }[] = [
  { status: 'MATCHED', title: 'Matched', color: '#15803d', hint: 'Same UTR and amount as a member’s payment. Approve them all in one tap.' },
  { status: 'AMOUNT_DIFFERS', title: 'Amount differs', color: '#b45309', hint: 'Same UTR, different amount. Check, then approve or reject in To verify.' },
  { status: 'UNKNOWN', title: 'Unknown money', color: '#7c3aed', hint: 'Money arrived but no member submitted it. Record it for the right flat.' },
  { status: 'ALREADY_RECORDED', title: 'Already recorded', color: '#475569', hint: 'This payment is already in the books.' },
  { status: 'APPROVED', title: 'Approved from here', color: '#15803d', hint: 'Approved from this statement.' },
];

/**
 * Bank statement match: upload the society’s statement (Excel or CSV from netbanking) and compare every credit with
 * members’ UTR submissions. The app never logs in to the bank.
 */
export function BankStatementView({ onApproved }: { onApproved: () => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [history, setHistory] = useState<BankStatementSummary[]>([]);
  const [detail, setDetail] = useState<BankStatementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<BankStatementLine | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      setHistory(await fetchBankStatements());
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load statements'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function pickAndUpload() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'text/csv',
        'text/comma-separated-values',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const file = picked.assets[0];
    if (/\.pdf$/i.test(file.name)) {
      toast('PDF is not supported yet. Download the statement as Excel or CSV from netbanking.', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await uploadBankStatement({ uri: file.uri, name: file.name, mimeType: file.mimeType });
      setDetail(result);
      toast(
        result.newCount === 0
          ? 'All lines in this file were already uploaded before.'
          : `Read ${result.creditCount} credits (${result.newCount} new).`,
        'success'
      );
      void loadHistory();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not read the statement'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    try {
      setDetail(await fetchBankStatement(id));
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not open the statement'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function approveAll() {
    if (!detail) return;
    const n = detail.counts.MATCHED ?? 0;
    confirm({
      title: `Approve ${n} matched payment(s)?`,
      message: 'Each one is recorded as maintenance and the member gets a receipt, the same as approving one by one.',
      confirmText: 'Approve all',
      onConfirm: async () => {
        setBusy(true);
        try {
          const result = await approveMatchedBankLines(detail.statementId);
          setDetail(result);
          const failed = result.failed?.length ?? 0;
          toast(
            failed > 0 ? `Approved ${result.approvedNow}. ${failed} could not be approved: ${result.failed?.join('; ')}` : `Approved ${result.approvedNow}.`,
            failed > 0 ? 'error' : 'success'
          );
          if ((result.approvedNow ?? 0) > 0 && failed === 0) onApproved();
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not approve'), 'error');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  if (detail) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setDetail(null)}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← All statements</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {detail.from} to {detail.to}
        </Text>
        <Text style={{ color: theme.textMuted }}>
          {detail.creditCount} credits · {formatInr(detail.totalCredits)}
          {detail.alreadyUploaded > 0 ? ` · ${detail.alreadyUploaded} were in an earlier upload` : ''}
        </Text>
        {(detail.counts.MATCHED ?? 0) > 0 ? (
          <Pressable onPress={approveAll} disabled={busy} style={[styles.primary, { backgroundColor: '#15803d', opacity: busy ? 0.6 : 1 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Approve all {detail.counts.MATCHED} matched</Text>}
          </Pressable>
        ) : null}

        {detail.notInBank.length > 0 ? (
          <View style={[styles.group, { borderColor: '#b91c1c' }]}>
            <Text style={[styles.groupTitle, { color: '#b91c1c' }]}>Not in bank ({detail.notInBank.length})</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              Members submitted these UTRs for dates in this statement, but the money is not in it. Do not approve until it is found.
            </Text>
            {detail.notInBank.map((p) => (
              <Text key={p.paymentId} style={{ color: theme.text }}>
                {unitName(p.flatNumber)} · {p.memberName} · {formatInr(p.amount)} · UTR {p.referenceNo}
              </Text>
            ))}
          </View>
        ) : null}

        {GROUPS.map((g) => {
          const rows = detail.lines.filter((l) => l.status === g.status);
          if (rows.length === 0) return null;
          return (
            <View key={g.status} style={[styles.group, { borderColor: theme.cardBorder }]}>
              <Text style={[styles.groupTitle, { color: g.color }]}>
                {g.title} ({rows.length})
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>{g.hint}</Text>
              {rows.map((l) => (
                <View key={l.lineId} style={[styles.line, { borderTopColor: theme.divider }]}>
                  <View style={styles.lineTop}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{formatInr(l.amount)}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{l.date}</Text>
                  </View>
                  {l.flatNumber ? (
                    <Text style={{ color: theme.text }}>
                      {unitName(l.flatNumber)} · {l.memberName}
                      {l.status === 'AMOUNT_DIFFERS' && l.submittedAmount !== undefined ? ` · member said ${formatInr(l.submittedAmount)}` : ''}
                    </Text>
                  ) : null}
                  <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={2}>
                    {l.utr ? `UTR ${l.utr} · ` : ''}
                    {l.narration}
                  </Text>
                  {l.status === 'UNKNOWN' ? (
                    <Pressable onPress={() => setRecording(l)}>
                      <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 4 }}>Record for a flat</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          );
        })}
        {detail.lines.length === 0 ? <ListEmpty message="No new credits in this file." /> : null}

        <AddMaintenanceModal
          visible={!!recording}
          onClose={() => setRecording(null)}
          onSaved={() => {
            setRecording(null);
            void open(detail.statementId);
          }}
          prefill={recording ? { amount: recording.amount, date: recording.date, referenceNo: recording.utr, note: 'From bank statement' } : null}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void loadHistory()} />}>
      <Text style={{ color: theme.textMuted, lineHeight: 20 }}>
        Download the society’s bank statement from netbanking as Excel or CSV and upload it here. The app finds each UPI
        reference (UTR) and matches it with members’ payments. Uploading the same file again is safe.
      </Text>
      <Pressable onPress={() => void pickAndUpload()} disabled={busy} style={[styles.primary, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Upload bank statement</Text>}
      </Pressable>
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <ListError message={error} /> : null}
      {!loading && !error && history.length === 0 ? <ListEmpty message="No statement uploaded yet." /> : null}
      {history.map((s) => (
        <Pressable key={s.statementId} onPress={() => void open(s.statementId)} style={[styles.card, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>
            {s.from} to {s.to}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {s.creditCount} credits ({s.newCount} new) · {s.uploadedByName ?? ''} · {formatDateTime(s.uploadedAt)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 12, gap: 10, paddingBottom: 40 },
  title: { fontSize: 17, fontWeight: '800' },
  primary: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  group: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  groupTitle: { fontSize: 15, fontWeight: '800' },
  line: { borderTopWidth: 1, paddingTop: 8, marginTop: 4, gap: 2 },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
});
