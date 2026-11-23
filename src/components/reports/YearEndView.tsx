import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  closeFinancialYear,
  fetchFinancialYears,
  fetchIncomeExpenditure,
  fetchReceiptsPayments,
  reopenFinancialYear,
} from '../../services/api';
import type { FinancialYearRow, FinancialYears, IncomeExpenditure, ReceiptsPayments, StatementHead } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListError } from '../dashboard/ListStates';
import { ModalKeyboardAvoidingView } from '../KeyboardSafeView';
import { apiErrorMessage } from '../../utils/apiError';
import { formatDateTime, formatInr } from '../../utils/format';
import { PdfButton } from './AccountsViews';

function Line({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.line}>
      <Text style={{ color: theme.text, flex: 1, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ color: color ?? theme.text, fontWeight: bold ? '800' : '600' }}>{formatInr(value)}</Text>
    </View>
  );
}

function Heads({ rows }: { rows: StatementHead[] }) {
  return (
    <>
      {rows.map((r) => (
        <Line key={r.head} label={`   ${r.head}`} value={r.amount} />
      ))}
    </>
  );
}

/**
 * Year end: pick a financial year, see Receipts & Payments and Income & Expenditure with PDFs, and close the year
 * after the audit (chairman or treasurer) or reopen it (chairman, with a reason).
 */
export function YearEndView() {
  const { theme } = useTheme();
  const { alert, confirm, toast } = useAppAlert();
  const [years, setYears] = useState<FinancialYears | null>(null);
  const [fy, setFy] = useState<number | null>(null);
  const [rp, setRp] = useState<ReceiptsPayments | null>(null);
  const [ie, setIe] = useState<IncomeExpenditure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchFinancialYears()
      .then((y) => {
        setYears(y);
        // Start with the last finished year: the one being audited.
        setFy((y.years.find((r) => r.ended) ?? y.years[0])?.fyStart ?? null);
      })
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the years')));
  }, []);

  const load = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([fetchReceiptsPayments(year), fetchIncomeExpenditure(year)]);
      setRp(a);
      setIe(b);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load the statements'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fy !== null) void load(fy);
  }, [fy, load]);

  const row: FinancialYearRow | undefined = years?.years.find((y) => y.fyStart === fy);

  function close() {
    if (!row) return;
    confirm({
      title: `Close ${row.label}?`,
      message:
        `After closing, no entry dated ${row.from} to ${row.to} can be added, changed or reversed. ` +
        'Do this after the audit. Only the chairman can reopen it.',
      confirmText: 'Close year',
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          setYears(await closeFinancialYear(row.fyStart));
          toast(`${row.label} is closed`, 'success');
        } catch (e) {
          alert('Could not close', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function reopen() {
    if (!row) return;
    if (reason.trim().length < 5) {
      alert('Reason needed', 'Write why the year is being reopened.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      setYears(await reopenFinancialYear(row.fyStart, reason.trim()));
      setReopening(false);
      setReason('');
      toast(`${row.label} is open again`, 'success');
    } catch (e) {
      alert('Could not reopen', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.gap}>
      {years ? (
        <View style={styles.chips}>
          {years.years.map((y) => {
            const on = y.fyStart === fy;
            return (
              <Pressable
                key={y.fyStart}
                onPress={() => setFy(y.fyStart)}
                style={[
                  styles.chip,
                  { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : 'transparent' },
                ]}
              >
                <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 13 }}>
                  {y.label}
                  {y.closed ? ' 🔒' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {row ? (
        <View style={[styles.status, { borderColor: row.closed ? '#b45309' : theme.cardBorder }]}>
          <Text style={{ color: theme.text, fontWeight: '800' }}>
            {row.closed ? `Closed${row.closedByName ? ` by ${row.closedByName}` : ''}` : row.ended ? 'Open (year has ended)' : 'Running year'}
          </Text>
          {row.closed && row.closedAt ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{formatDateTime(row.closedAt)}</Text>
          ) : null}
          {!row.closed && row.reopenedByName ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              Reopened by {row.reopenedByName} · {formatDateTime(row.reopenedAt ?? null)} · {row.reopenReason}
            </Text>
          ) : null}
          {years?.canClose && row.ended && !row.closed ? (
            <Pressable onPress={close} disabled={busy} style={[styles.action, { backgroundColor: '#b45309' }]}>
              <Text style={styles.actionText}>Close {row.label} after audit</Text>
            </Pressable>
          ) : null}
          {years?.canReopen && row.closed ? (
            <Pressable onPress={() => setReopening(true)} disabled={busy} style={[styles.action, { backgroundColor: theme.accent }]}>
              <Text style={styles.actionText}>Reopen {row.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <ListError message={error} /> : null}

      {rp && !loading && fy !== null ? (
        <View style={[styles.card, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.text }]}>Receipts & Payments</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {rp.from} to {rp.to} · money actually received and paid
          </Text>
          <Line label="Opening cash in hand" value={rp.openingCash} />
          <Line label="Opening bank balance" value={rp.openingBank} />
          <Line label="Receipts" value={rp.totalReceipts} bold color="#15803d" />
          <Heads rows={rp.receipts} />
          <Line label="Payments" value={rp.totalPayments} bold color="#b91c1c" />
          <Heads rows={rp.payments} />
          <Line label="Closing cash in hand" value={rp.closingCash} />
          <Line label="Closing bank balance" value={rp.closingBank} bold />
          <PdfButton path={`/society/years/${fy}/receipts-payments/pdf`} name={`receipts-payments-${rp.label}.pdf`} />
        </View>
      ) : null}

      {ie && !loading && fy !== null ? (
        <View style={[styles.card, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.text }]}>Income & Expenditure</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {ie.from} to {ie.to} · maintenance counted for the months billed
          </Text>
          <Line label="Income" value={ie.totalIncome} bold color="#15803d" />
          <Line label="   Maintenance billed" value={ie.maintenanceBilled} />
          {ie.lateFeesBilled ? <Line label="   Late fees billed" value={ie.lateFeesBilled} /> : null}
          {ie.gstBilled ? <Line label="   GST billed" value={ie.gstBilled} /> : null}
          <Heads rows={ie.otherIncome} />
          <Line label="Expenditure" value={ie.totalExpenditure} bold color="#b91c1c" />
          <Heads rows={ie.expenditure} />
          <Line
            label={ie.surplus >= 0 ? 'Surplus' : 'Deficit'}
            value={Math.abs(ie.surplus)}
            bold
            color={ie.surplus >= 0 ? '#15803d' : '#b91c1c'}
          />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Of this year's bills, {formatInr(ie.billedStillUnpaid)} is still unpaid today. {ie.note}
          </Text>
          <PdfButton path={`/society/years/${fy}/income-expenditure/pdf`} name={`income-expenditure-${ie.label}.pdf`} />
        </View>
      ) : null}

      <Modal visible={reopening} transparent animationType="fade" onRequestClose={() => setReopening(false)}>
        <ModalKeyboardAvoidingView style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.title, { color: theme.text }]}>Reopen {row?.label}</Text>
            <Text style={{ color: theme.textMuted }}>The reason is recorded with your name.</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Auditor asked for a correction"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              maxLength={300}
              multiline
              autoFocus
            />
            <View style={styles.row}>
              <Pressable onPress={() => setReopening(false)} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void reopen()} disabled={busy} style={[styles.action, styles.flex1, { backgroundColor: theme.accent }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Reopen</Text>}
              </Pressable>
            </View>
          </View>
        </ModalKeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  status: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 6 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 },
  action: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  actionText: { color: '#fff', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { borderRadius: 18, padding: 18, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  secondary: { flex: 1, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
});
