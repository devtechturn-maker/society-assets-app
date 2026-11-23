import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { downloadPdfToDevice, fetchBook, fetchFlatStatement, fetchMembers } from '../../services/api';
import type { BookReport, FlatStatement, ReportRange, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { formatInr } from '../../utils/format';
import { unitName } from '../../utils/unitName';
import { periodLabel } from '../../utils/reportPeriods';

async function sharePdf(path: string, name: string) {
  const { uri } = await downloadPdfToDevice(path, name);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('PDF saved, but sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
}

function rangeQuery(range: ReportRange): string {
  return [range.from ? `from=${range.from}` : '', range.to ? `to=${range.to}` : ''].filter(Boolean).join('&');
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : 'transparent' },
      ]}
    >
      <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function PdfButton({ path, name }: { path: string; name: string }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await sharePdf(path, name);
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not make the PDF'), 'error');
        } finally {
          setBusy(false);
        }
      }}
      style={[styles.pdfBtn, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.pdfText}>Download / share PDF</Text>}
    </Pressable>
  );
}

/** Cash book, bank book or both, for the chosen dates, with a running balance. */
export function BookView({ range }: { range: ReportRange }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'CASH' | 'BANK' | 'ALL'>('CASH');
  const [data, setData] = useState<BookReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchBook(mode, range)
      .then((b) => live && (setData(b), setError(null)))
      .catch((e) => live && setError(apiErrorMessage(e, 'Could not load the book')))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [mode, range.from, range.to]);

  const q = rangeQuery(range);
  return (
    <View style={styles.gap}>
      <View style={styles.chips}>
        <Chip label="Cash book" on={mode === 'CASH'} onPress={() => setMode('CASH')} />
        <Chip label="Bank book" on={mode === 'BANK'} onPress={() => setMode('BANK')} />
        <Chip label="Both" on={mode === 'ALL'} onPress={() => setMode('ALL')} />
      </View>
      <Text style={{ color: theme.textMuted }}>{periodLabel(range)}</Text>
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <ListError message={error} /> : null}
      {data && !loading ? (
        <>
          <View style={[styles.totals, { borderColor: theme.cardBorder }]}>
            <Text style={{ color: theme.text }}>Opening {formatInr(data.openingBalance)}</Text>
            <Text style={{ color: '#15803d' }}>In {formatInr(data.totalIn)}</Text>
            <Text style={{ color: '#b91c1c' }}>Out {formatInr(data.totalOut)}</Text>
            <Text style={{ color: theme.text, fontWeight: '800' }}>Closing {formatInr(data.closingBalance)}</Text>
          </View>
          {data.rows.length === 0 ? <ListEmpty message="No entries for these dates." /> : null}
          {data.rows.map((r) => (
            <View key={r.expenseId} style={[styles.row, { borderTopColor: theme.divider }]}>
              <View style={styles.rowTop}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{r.date}</Text>
                <Text style={{ color: r.in ? '#15803d' : '#b91c1c', fontWeight: '800' }}>
                  {r.in ? `+ ${formatInr(r.in)}` : `− ${formatInr(r.out)}`}
                </Text>
              </View>
              <Text style={{ color: theme.text }}>{r.particulars}</Text>
              {r.voucherNo || r.referenceNo ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {[r.voucherNo, r.referenceNo].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>Balance {formatInr(r.balance)}</Text>
            </View>
          ))}
          <PdfButton path={`/society/dashboard/reports/book/pdf?mode=${mode}${q ? `&${q}` : ''}`} name="book.pdf" />
        </>
      ) : null}
    </View>
  );
}

/** Pick a flat, see every bill and payment with the running balance, and share it as a PDF. */
export function FlatStatementView() {
  const { theme } = useTheme();
  const [flats, setFlats] = useState<SocietyMember[]>([]);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<SocietyMember | null>(null);
  const [data, setData] = useState<FlatStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMembers()
      .then(setFlats)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load flats')));
  }, []);

  useEffect(() => {
    if (!chosen) return;
    setLoading(true);
    fetchFlatStatement(chosen.id)
      .then((s) => (setData(s), setError(null)))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the statement')))
      .finally(() => setLoading(false));
  }, [chosen]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flats
      .filter((f) => f.flatNumber?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q))
      .slice(0, 12);
  }, [flats, query]);

  return (
    <View style={styles.gap}>
      {chosen ? (
        <Pressable onPress={() => (setChosen(null), setData(null))}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>
            {unitName(chosen.flatNumber)} · {chosen.name} (change)
          </Text>
        </Pressable>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search flat number or name"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
            autoCapitalize="characters"
          />
          {matches.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => (setChosen(f), setQuery(''))}
              style={[styles.pick, { borderColor: theme.cardBorder }]}
            >
              <Text style={{ color: theme.text, fontWeight: '700' }}>{unitName(f.flatNumber)}</Text>
              <Text style={{ color: theme.textMuted }}>{f.name}</Text>
            </Pressable>
          ))}
        </>
      )}
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <ListError message={error} /> : null}
      {data && chosen && !loading ? (
        <>
          <View style={[styles.totals, { borderColor: theme.cardBorder }]}>
            <Text style={{ color: theme.text }}>Billed {formatInr(data.totalCharged)}</Text>
            <Text style={{ color: '#15803d' }}>Paid {formatInr(data.totalPaid)}</Text>
            <Text style={{ color: data.closingBalance > 0 ? '#b91c1c' : theme.text, fontWeight: '800' }}>
              Balance due {formatInr(data.closingBalance)}
            </Text>
          </View>
          {data.rows.length === 0 ? <ListEmpty message="No bills or payments yet." /> : null}
          {data.rows.map((r, i) => (
            <View key={`${r.date}-${i}`} style={[styles.row, { borderTopColor: theme.divider }]}>
              <View style={styles.rowTop}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{r.date ?? ''}</Text>
                <Text style={{ color: r.paid ? '#15803d' : theme.text, fontWeight: '800' }}>
                  {r.paid ? `Paid ${formatInr(r.paid)}` : `Bill ${formatInr(r.charge)}`}
                </Text>
              </View>
              <Text style={{ color: theme.text }}>{r.particulars}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>Balance {formatInr(r.balance)}</Text>
            </View>
          ))}
          <PdfButton path={`/society/dashboard/reports/flat-statement/${chosen.id}/pdf`} name="flat-statement.pdf" />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  totals: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  row: { borderTopWidth: 1, paddingVertical: 8, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pdfBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6, minHeight: 46, justifyContent: 'center' },
  pdfText: { color: '#fff', fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  pick: { borderWidth: 1, borderRadius: 10, padding: 10 },
});

