import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchFlatAreas, saveFlatAreas } from '../../services/api';
import type { FlatAreaRow } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { unitName } from '../../utils/unitName';

/** Optional flat areas (sq ft), used by per-sq-ft maintenance or charges. Earlier months keep the area they had. */
export function FlatAreasSection() {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [rows, setRows] = useState<FlatAreaRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function take(list: FlatAreaRow[]) {
    setRows(list);
    setDraft(Object.fromEntries(list.map((r) => [r.memberId, r.areaSqft == null ? '' : String(r.areaSqft)])));
  }

  useEffect(() => {
    fetchFlatAreas()
      .then(take)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load flat areas')));
  }, []);

  async function save() {
    if (!rows) return;
    const changed = rows
      .filter((r) => (draft[r.memberId] ?? '') !== (r.areaSqft == null ? '' : String(r.areaSqft)))
      .map((r) => ({ memberId: r.memberId, areaSqft: draft[r.memberId] ?? '' }));
    if (changed.length === 0) {
      toast('Nothing changed', 'success');
      return;
    }
    setBusy(true);
    try {
      take(await saveFlatAreas(changed));
      toast(`Saved ${changed.length} flat area(s)`, 'success');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ListError message={error} />;
  if (!rows) return <ActivityIndicator color={theme.accent} />;
  return (
    <View style={styles.gap}>
      <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18 }}>
        Optional. Only needed for maintenance or charges per sq ft. Leave empty if not used.
      </Text>
      {rows.map((r) => (
        <View key={r.memberId} style={[styles.row, { borderColor: theme.divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{unitName(r.flatNumber)}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{r.name}</Text>
          </View>
          <TextInput
            value={draft[r.memberId] ?? ''}
            onChangeText={(t) => setDraft((d) => ({ ...d, [r.memberId]: t.replace(/[^0-9.]/g, '') }))}
            placeholder="sq ft"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
            style={[styles.input, { borderColor: theme.inputBorder, color: theme.inputText, backgroundColor: theme.inputBg }]}
          />
        </View>
      ))}
      <Pressable onPress={() => void save()} disabled={busy} style={[styles.btn, { backgroundColor: theme.accent }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save areas</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, width: 110 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800' },
});
