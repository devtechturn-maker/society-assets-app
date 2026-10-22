import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ListError, ListLoading } from '../../components/dashboard/ListStates';
import { inr } from '../../components/payment/MaintenancePayment';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import {
  downloadOpeningDuesSample,
  fetchOpeningBalances,
  saveOpeningBalances,
  saveOpeningDue,
  uploadOpeningDuesExcel,
  validateOpeningDuesExcel,
} from '../../services/api';
import type { OpeningBalances, OpeningDueRow, OpeningDuesValidation } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function day(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Where the society's books stood when it started using the app: cash in hand, bank balance and every flat's
 * unpaid maintenance up to then. The chairman or treasurer fills it in once (by hand or from Excel).
 */
export function OpeningBalancesModule() {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const load = useAsyncLoad(fetchOpeningBalances, []);
  const [data, setData] = useState<OpeningBalances | null>(null);
  const [asOf, setAsOf] = useState(today());
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [validation, setValidation] = useState<OpeningDuesValidation | null>(null);
  const [busyExcel, setBusyExcel] = useState<'sample' | 'check' | 'import' | null>(null);
  const [filter, setFilter] = useState('');
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  useEffect(() => {
    if (load.data) apply(load.data);
  }, [load.data]);

  function apply(d: OpeningBalances) {
    setData(d);
    setAsOf(d.asOfDate ?? today());
    setCash(d.configured ? String(d.openingCashBalance) : '');
    setBank(d.configured ? String(d.openingBankBalance) : '');
  }

  async function saveBalances() {
    setSaving(true);
    try {
      apply(await saveOpeningBalances({ asOfDate: asOf.trim(), openingCashBalance: cash.trim() || '0', openingBankBalance: bank.trim() || '0' }));
      alert('Saved', 'Opening balances saved. The dashboard now includes them.', { variant: 'success' });
    } catch (e) {
      alert('Could not save', apiErrorMessage(e, 'Please check the values.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function shareSample() {
    setBusyExcel('sample');
    try {
      const uri = await downloadOpeningDuesSample();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Opening dues sample',
        });
      }
    } catch (e) {
      alert('Sample unavailable', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusyExcel(null);
    }
  }

  async function pickAndCheck() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const file = { uri: asset.uri, name: asset.name ?? 'opening-dues.xlsx', mimeType: asset.mimeType ?? null };
    setPicked(file);
    setValidation(null);
    setBusyExcel('check');
    try {
      setValidation(await validateOpeningDuesExcel(file.uri, file.name, file.mimeType));
    } catch (e) {
      alert('Could not read the file', apiErrorMessage(e, 'Use the sample sheet format.'), { variant: 'error' });
    } finally {
      setBusyExcel(null);
    }
  }

  async function importFile() {
    if (!picked || !validation?.summary.canImport) return;
    setBusyExcel('import');
    try {
      const result = await uploadOpeningDuesExcel(picked.uri, picked.name, picked.mimeType);
      apply(result);
      setPicked(null);
      setValidation(null);
      alert('Imported', `${result.imported} flat(s) updated.`, { variant: 'success' });
    } catch (e) {
      alert('Import failed', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusyExcel(null);
    }
  }

  const canEdit = data?.canEdit === true;
  const rows = (data?.memberDues ?? []).filter((r) => {
    const q = filter.trim().toLowerCase();
    return !q || r.flatNumber?.toLowerCase().includes(q) || r.memberName?.toLowerCase().includes(q);
  });

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: theme.pageBg }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={load.refreshing} onRefresh={() => void load.refresh()} />}
    >
      {load.loading && !data ? <ListLoading /> : null}
      {load.error ? <ListError message={load.error} /> : null}

      {data ? (
        <SectionCard
          title="Start date & balances"
          subtitle="Enter the cash in hand and bank balance on the day the society started using the app. Money before this date is already inside these balances."
        >
          <Text style={[styles.label, { color: theme.text }]}>Start date</Text>
          <TextInput style={input} value={asOf} onChangeText={setAsOf} editable={canEdit} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} maxLength={10} />
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>Cash in hand (₹)</Text>
              <TextInput style={input} value={cash} onChangeText={setCash} editable={canEdit} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.placeholder} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>Bank balance (₹)</Text>
              <TextInput style={input} value={bank} onChangeText={setBank} editable={canEdit} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={theme.placeholder} />
            </View>
          </View>
          {canEdit ? (
            <Pressable onPress={() => void saveBalances()} disabled={saving} style={[styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save balances</Text>}
            </Pressable>
          ) : (
            <Text style={[styles.meta, { color: theme.textMuted }]}>Only the chairman or treasurer can change these.</Text>
          )}
          {data.configured ? (
            <Text style={[styles.meta, { color: theme.textMuted, marginTop: 8 }]}>Last saved {day(data.updatedAt)}.</Text>
          ) : null}
        </SectionCard>
      ) : null}

      {data?.configured ? (
        <SectionCard
          title="Flats' opening dues"
          subtitle={`Unpaid maintenance up to ${day(data.asOfDate)}. Members pay it first, before later months. Months before the start date are not charged again.`}
        >
          <View style={styles.totals}>
            <View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>Total opening dues</Text>
              <Text style={[styles.total, { color: theme.text }]}>{inr(data.totalOpeningDues)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.meta, { color: theme.textMuted }]}>Still unpaid</Text>
              <Text style={[styles.total, { color: theme.text }]}>{inr(data.openingDuesStillPending)}</Text>
            </View>
          </View>

          {canEdit ? (
            <View style={[styles.excelBox, { borderColor: theme.cardBorder }]}>
              <Text style={[styles.excelTitle, { color: theme.text }]}>Import from Excel</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Columns: flatNumber, openingDue, note. Flats not in the file are not changed.
              </Text>
              <View style={styles.excelActions}>
                <Pressable onPress={() => void shareSample()} disabled={!!busyExcel} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                  {busyExcel === 'sample' ? <ActivityIndicator /> : <Text style={{ color: theme.text, fontWeight: '700' }}>Sample sheet</Text>}
                </Pressable>
                <Pressable onPress={() => void pickAndCheck()} disabled={!!busyExcel} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                  {busyExcel === 'check' ? <ActivityIndicator /> : <Text style={{ color: theme.text, fontWeight: '700' }}>Choose file</Text>}
                </Pressable>
              </View>
              {validation ? (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.meta, { color: theme.text }]}>
                    {picked?.name}: {validation.summary.valid} of {validation.summary.total} rows OK · total {inr(validation.summary.totalOpeningDues)}
                  </Text>
                  {validation.rows.filter((r) => !r.valid).slice(0, 20).map((r) => (
                    <Text key={r.rowNumber} style={styles.error}>
                      Row {r.rowNumber} {r.flatNumber ? `(${r.flatNumber})` : ''}: {r.errors.join('; ')}
                    </Text>
                  ))}
                  {validation.summary.canImport ? (
                    <Pressable onPress={() => void importFile()} disabled={!!busyExcel} style={[styles.primary, { backgroundColor: theme.accent, marginTop: 4 }]}>
                      {busyExcel === 'import' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Import {validation.summary.total} flat(s)</Text>}
                    </Pressable>
                  ) : (
                    <Text style={[styles.meta, { color: theme.textMuted }]}>Fix these rows in the file and choose it again.</Text>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <TextInput
            style={[input, { marginTop: 12 }]}
            value={filter}
            onChangeText={setFilter}
            placeholder="Search flat or name"
            placeholderTextColor={theme.placeholder}
          />
          {rows.map((row) => (
            <DueRow key={row.memberId} row={row} canEdit={canEdit} onSaved={apply} />
          ))}
        </SectionCard>
      ) : data && !data.configured ? (
        <SectionCard title="Flats' opening dues" subtitle="Save the start date and balances above first.">
          {null}
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function DueRow({ row, canEdit, onSaved }: { row: OpeningDueRow; canEdit: boolean; onSaved: (d: OpeningBalances) => void }) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [amount, setAmount] = useState(row.openingDue ? String(row.openingDue) : '');
  const [note, setNote] = useState(row.note ?? '');
  const [busy, setBusy] = useState(false);
  const dirty = (amount.trim() || '0') !== String(row.openingDue || 0) || note.trim() !== (row.note ?? '');
  const editable = canEdit && !row.locked;

  async function save() {
    setBusy(true);
    try {
      onSaved(await saveOpeningDue(row.memberId, amount.trim() || '0', note.trim()));
    } catch (e) {
      alert('Could not save', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.row, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
      <View style={styles.rowHead}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>
          {row.flatNumber} · {row.memberName}
        </Text>
        {row.locked ? <Ionicons name="lock-closed" size={14} color={theme.textMuted} /> : null}
      </View>
      {editable ? (
        <>
          <View style={styles.two}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="₹0"
              placeholderTextColor={theme.placeholder}
            />
            <TextInput
              style={[styles.input, { flex: 1.4, backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              value={note}
              onChangeText={setNote}
              placeholder="Note (e.g. Jan–Mar)"
              placeholderTextColor={theme.placeholder}
              maxLength={200}
            />
          </View>
          {dirty ? (
            <Pressable onPress={() => void save()} disabled={busy} style={[styles.save, { backgroundColor: theme.accent }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {inr(row.openingDue)}
          {row.note ? ` · ${row.note}` : ''}
          {row.locked ? (row.openingDue > 0 ? ' · already being collected' : ' · paid in the app already') : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 48, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 9, fontSize: 15 },
  two: { flexDirection: 'row', gap: 10 },
  primary: { marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  meta: { fontSize: 12, lineHeight: 17 },
  totals: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  total: { fontSize: 20, fontWeight: '900' },
  excelBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8, marginTop: 6 },
  excelTitle: { fontSize: 14, fontWeight: '800' },
  excelActions: { flexDirection: 'row', gap: 10 },
  error: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  row: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8, gap: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  save: { borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
});
