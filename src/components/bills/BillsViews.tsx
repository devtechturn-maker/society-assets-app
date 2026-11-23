import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { downloadPdfToDevice, fetchBills, fetchMyBills, generateBills, regenerateBill } from '../../services/api';
import type { BillRow, BillsMonth } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { formatInr } from '../../utils/format';
import { unitName } from '../../utils/unitName';

const STATUS: Record<BillRow['status'], { label: string; color: string }> = {
  PAID: { label: 'Paid', color: '#15803d' },
  PARTLY_PAID: { label: 'Partly paid', color: '#b45309' },
  UNPAID: { label: 'Unpaid', color: '#b91c1c' },
};

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function usePdf() {
  const { toast } = useAppAlert();
  const [busyId, setBusyId] = useState<string | null>(null);
  async function share(path: string, billNo: string, id: string) {
    setBusyId(id);
    try {
      const { uri } = await downloadPdfToDevice(path, `${billNo.replace(/\//g, '-')}.pdf`);
      if (!(await Sharing.isAvailableAsync())) throw new Error('PDF saved, but sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: billNo });
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not open the bill'), 'error');
    } finally {
      setBusyId(null);
    }
  }
  return { busyId, share };
}

/** Office: a month's bills with paid / partly paid / unpaid, Generate now, re-make an unpaid bill, PDF. */
export function OfficeBillsView() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<BillsMonth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pdf = usePdf();

  const load = useCallback(async (m?: string) => {
    try {
      const d = await fetchBills(m);
      setData(d);
      setMonth(d.month);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load bills'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    if (!month) return;
    setBusy(true);
    try {
      const d = await generateBills(month);
      setData(d);
      toast(`${d.count} bill(s) for ${d.month}. Members are notified.`, 'success');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not make bills'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function remake(b: BillRow) {
    confirm({
      title: `Re-make bill ${b.billNo}?`,
      message: 'Use this after correcting a charge or meter reading. The bill number stays the same.',
      confirmText: 'Re-make',
      onConfirm: async () => {
        try {
          await regenerateBill(b.billId);
          toast('Bill re-made', 'success');
          void load(month ?? undefined);
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not re-make the bill'), 'error');
        }
      },
    });
  }

  if (error) return <ListError message={error} />;
  if (!data || !month) return <ActivityIndicator color={theme.accent} />;
  return (
    <View style={styles.gap}>
      {!data.enabled ? (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          Monthly bills are off. Turn on “Monthly bills” in Settings → Maintenance Rules to send a numbered bill to every flat on the 1st.
        </Text>
      ) : null}
      <View style={styles.monthRow}>
        <Pressable onPress={() => void load(shiftMonth(month, -1))}>
          <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>‹</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: '800' }}>{month}</Text>
        <Pressable onPress={() => void load(shiftMonth(month, 1))}>
          <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>›</Text>
        </Pressable>
      </View>
      {data.count > 0 ? (
        <Text style={{ color: theme.textMuted }}>
          {data.count} bills · {formatInr(data.billed)} billed · {data.counts.PAID} paid · {data.counts.PARTLY_PAID} partly · {data.counts.UNPAID} unpaid
        </Text>
      ) : null}
      {data.enabled && data.canManage ? (
        <Pressable onPress={() => void generate()} disabled={busy} style={[styles.btn, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{data.count > 0 ? 'Make missing bills' : `Make bills for ${month}`}</Text>}
        </Pressable>
      ) : null}
      {data.count === 0 ? <ListEmpty message="No bills for this month." /> : null}
      {data.bills.map((b) => (
        <View key={b.billId} style={[styles.row, { borderColor: theme.divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {unitName(b.flatNumber)} · {formatInr(b.total)}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {b.billNo} · {b.memberName}
              {b.arrears > 0 ? ` · incl. earlier ${formatInr(b.arrears)}` : ''}
            </Text>
            <View style={styles.actions}>
              <Pressable onPress={() => void pdf.share(`/society/bills/${b.billId}/pdf`, b.billNo, b.billId)}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>{pdf.busyId === b.billId ? 'Opening…' : 'PDF'}</Text>
              </Pressable>
              {data.canManage && b.status === 'UNPAID' ? (
                <Pressable onPress={() => remake(b)}>
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>Re-make</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Text style={{ color: STATUS[b.status].color, fontWeight: '800', fontSize: 12 }}>{STATUS[b.status].label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Member: the flat's bills with the itemised lines and the PDF. */
export function MyBillsView() {
  const { theme } = useTheme();
  const [rows, setRows] = useState<BillRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const pdf = usePdf();

  useEffect(() => {
    fetchMyBills()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (!rows) return <ActivityIndicator color={theme.accent} />;
  if (rows.length === 0) return <ListEmpty message="No bills yet. Your society sends them on the 1st if it uses monthly bills." />;
  return (
    <View style={styles.gap}>
      {rows.map((b) => (
        <View key={b.billId} style={[styles.row, { borderColor: theme.divider, flexDirection: 'column', alignItems: 'stretch' }]}>
          <Pressable onPress={() => setOpen(open === b.billId ? null : b.billId)} style={styles.top}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {b.month} · {formatInr(b.total)}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {b.billNo} · pay by {b.dueDate}
              </Text>
            </View>
            <Text style={{ color: STATUS[b.status].color, fontWeight: '800', fontSize: 12 }}>{STATUS[b.status].label}</Text>
          </Pressable>
          {open === b.billId ? (
            <View style={{ gap: 2, marginTop: 6 }}>
              {(b.lines ?? []).map((l, i) => (
                <View key={`${l.name}-${i}`} style={styles.top}>
                  <Text style={{ color: theme.text, flex: 1 }}>
                    {l.name}
                    {l.note ? ` (${l.note})` : ''}
                  </Text>
                  <Text style={{ color: theme.text }}>{formatInr(l.amount)}</Text>
                </View>
              ))}
              {b.arrears > 0 ? (
                <View style={styles.top}>
                  <Text style={{ color: theme.text, flex: 1 }}>Earlier unpaid amount</Text>
                  <Text style={{ color: theme.text }}>{formatInr(b.arrears)}</Text>
                </View>
              ) : null}
              {b.lateFeeNote ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{b.lateFeeNote}</Text> : null}
              <Pressable onPress={() => void pdf.share(`/member/bills/${b.billId}/pdf`, b.billNo, b.billId)}>
                <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 4 }}>{pdf.busyId === b.billId ? 'Opening…' : 'Download / share PDF'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 4 },
});
