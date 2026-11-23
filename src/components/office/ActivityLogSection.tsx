import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchActivityLog } from '../../services/api';
import type { ActivityRow } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { formatDateTime, formatInr } from '../../utils/format';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'SETTINGS', label: 'Settings' },
  { value: 'TEAM', label: 'Team' },
  { value: 'MEMBER_MAINTENANCE_PAYMENT', label: 'Payments' },
] as const;

/** Who changed money, settings or the team, and when. Chairman, treasurer, committee and auditors can read it. */
export function ActivityLogSection() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const data = await fetchActivityLog(nextPage, filter || undefined);
        setRows((current) => (nextPage === 0 ? data.content : [...current, ...data.content]));
        setPage(data.number);
        setTotalPages(data.totalPages);
        setError(null);
      } catch (e) {
        setError(apiErrorMessage(e, 'Could not load the activity log'));
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <View style={styles.gap}>
      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const on = f.value === filter;
          return (
            <Pressable
              key={f.label}
              onPress={() => setFilter(f.value)}
              style={[styles.chip, { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : 'transparent' }]}
            >
              <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 12 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <ListError message={error} /> : null}
      {!loading && !error && rows.length === 0 ? <ListEmpty message="Nothing recorded yet." /> : null}
      {rows.map((r) => (
        <View key={r.id} style={[styles.row, { borderColor: theme.divider }]}>
          <Text style={{ color: theme.text }}>{r.summary || r.action.replace(/_/g, ' ').toLowerCase()}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {[r.actorName, formatDateTime(r.createdAt), r.amount ? formatInr(r.amount) : ''].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {!loading && page + 1 < totalPages ? (
        <Pressable onPress={() => void load(page + 1)}>
          <Text style={{ color: theme.accent, fontWeight: '700', paddingVertical: 8 }}>Load more</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  row: { borderTopWidth: 1, paddingVertical: 8, gap: 2 },
});
