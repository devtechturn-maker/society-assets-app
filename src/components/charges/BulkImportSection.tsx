import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { checkBulkImport, downloadBulkImportSample, runBulkImport, type BulkImportKind, type BulkImportResult } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

const KINDS: { kind: BulkImportKind; title: string; columns: string }[] = [
  {
    kind: 'vehicles',
    title: 'Vehicles',
    columns: 'flatNumber, vehicleType (CAR / BIKE / OTHER), registrationNumber, makeModel, color, parkingSlot',
  },
  { kind: 'areas', title: 'Flat areas (sq ft)', columns: 'flatNumber, areaSqft' },
];

type Picked = { uri: string; name: string; mimeType: string | null };

/** v21: import vehicles and flat areas for existing flats from Excel. Check first, then import the OK rows. */
export function BulkImportSection() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 17 }}>
        To add new members use Members → Upload Excel (it now also takes an optional areaSqft column). Opening dues are
        imported from Opening balances.
      </Text>
      {KINDS.map((k) => (
        <ImportCard key={k.kind} {...k} />
      ))}
    </View>
  );
}

function ImportCard({ kind, title, columns }: { kind: BulkImportKind; title: string; columns: string }) {
  const { theme } = useTheme();
  const { toast, alert } = useAppAlert();
  const [busy, setBusy] = useState<null | 'sample' | 'check' | 'import'>(null);
  const [file, setFile] = useState<Picked | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  async function sample() {
    setBusy('sample');
    try {
      const uri = await downloadBulkImportSample(kind);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `${title} sample`,
        });
      }
    } catch (e) {
      toast(apiErrorMessage(e, 'Sample unavailable'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function pickAndCheck() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const a = picked.assets[0];
    const f = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? null };
    setBusy('check');
    try {
      setFile(f);
      setResult(await checkBulkImport(kind, f.uri, f.name, f.mimeType));
    } catch (e) {
      setFile(null);
      setResult(null);
      alert('Could not check the file', apiErrorMessage(e, 'Use the sample Excel.'), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function doImport() {
    if (!file) return;
    setBusy('import');
    try {
      const r = await runBulkImport(kind, file.uri, file.name, file.mimeType);
      toast(`${r.imported ?? 0} row(s) imported`, 'success');
      setResult(null);
      setFile(null);
    } catch (e) {
      alert('Import failed', apiErrorMessage(e, 'Nothing was saved.'), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  const bad = result?.rows.filter((r) => !r.valid) ?? [];
  return (
    <View style={[styles.card, { borderColor: theme.cardBorder }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>Columns: {columns}</Text>
      <View style={styles.row}>
        <Pressable disabled={!!busy} onPress={() => void sample()} style={[styles.btn, { borderColor: theme.cardBorder }]}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Sample Excel</Text>
        </Pressable>
        <Pressable disabled={!!busy} onPress={() => void pickAndCheck()} style={[styles.btn, { borderColor: theme.accent }]}>
          <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>Choose file & check</Text>
        </Pressable>
        {busy ? <ActivityIndicator color={theme.accent} /> : null}
      </View>
      {result ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>
            {result.valid} OK · {result.invalid} with problems · {result.total} rows
          </Text>
          {bad.slice(0, 30).map((r) => (
            <Text key={r.rowNumber} style={{ color: '#b91c1c', fontSize: 12 }}>
              Row {r.rowNumber} {r.flatNumber ? `(${r.flatNumber})` : ''}: {r.errors.join(', ')}
            </Text>
          ))}
          {bad.length > 30 ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>…and {bad.length - 30} more</Text>
          ) : null}
          {result.valid > 0 ? (
            <Pressable
              disabled={!!busy}
              onPress={() => void doImport()}
              style={[styles.primary, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}
            >
              <Text style={styles.primaryText}>
                Import {result.valid} OK row{result.valid === 1 ? '' : 's'}
                {result.invalid > 0 ? ` (skip ${result.invalid})` : ''}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Fix the file and check again.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  primary: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '800' },
});
