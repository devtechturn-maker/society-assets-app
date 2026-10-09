import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { checkInVisitor, fetchExpectedGuests, fetchGateKeeperDashboard } from '../../services/api';
import type { GateKeeperDashboard, VisitorSummary } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

function when(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
import { useTheme } from '../../theme/ThemeContext';
import { ListError } from '../../components/dashboard/ListStates';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { RecentVisitorRow } from '../../components/visitor/RecentVisitorRow';

export function GateKeeperDashboardModule() {
  const { theme } = useTheme();
  const [data, setData] = useState<GateKeeperDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expected, setExpected] = useState<VisitorSummary[]>([]);
  const [admitting, setAdmitting] = useState<string | null>(null);
  const { toast } = useAppAlert();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [dashboard, guests] = await Promise.all([
        fetchGateKeeperDashboard(),
        fetchExpectedGuests().catch(() => [] as VisitorSummary[]),
      ]);
      setData(dashboard);
      setExpected(guests);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (error && !data) {
    return <ListError message={error} onRetry={() => load()} />;
  }

  if (!data) return null;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.pageBg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Gate dashboard</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Today&apos;s visitor activity at a glance</Text>

      <KpiGrid
        items={[
          { label: 'Total today', value: data.todayTotal, isCurrency: false },
          { label: 'Pending', value: data.pendingApproval, isCurrency: false, highlight: data.pendingApproval > 0 },
          { label: 'Approved', value: data.approved, isCurrency: false },
          { label: 'Rejected', value: data.rejected, isCurrency: false },
        ]}
      />

      <SectionCard
        title="Expected guests"
        subtitle={expected.length === 0 ? 'No guest passes for now' : 'Added in advance by residents. Check the time before letting them in.'}
      >
        {expected.map((g) => {
          const notYet = !!g.validFrom && new Date(g.validFrom).getTime() > Date.now();
          return (
            <View key={g.id} style={[styles.row, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {g.visitorName}
                  {g.visitorCount > 1 ? ` +${g.visitorCount - 1}` : ''}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                  Flat {g.flatNumber} · {g.residentName}
                  {g.currentTenantName ? ' (tenant)' : ''} · {g.mobileNumber}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                  Valid {when(g.validFrom)} to {when(g.validUntil)}
                </Text>
              </View>
              <Pressable
                disabled={notYet || admitting === g.id}
                onPress={async () => {
                  setAdmitting(g.id);
                  try {
                    await checkInVisitor(g.id);
                    toast(`${g.visitorName} checked in`, 'success');
                    await load(true);
                  } catch (e) {
                    toast(apiErrorMessage(e, 'Could not check in'), 'error');
                  } finally {
                    setAdmitting(null);
                  }
                }}
                style={({ pressed }) => [
                  styles.statusPill,
                  {
                    borderColor: notYet ? theme.cardBorder : theme.accent,
                    backgroundColor: notYet ? theme.chipBg : theme.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.statusText, { color: notYet ? theme.textMuted : '#fff' }]}>
                  {admitting === g.id ? '…' : notYet ? 'Not yet' : 'Check in'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </SectionCard>

      <SectionCard
        title="Recent visitors"
        subtitle={data.recent.length === 0 ? 'No entries yet today' : 'Latest registrations and movements'}
      >
        {data.recent.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No visitors yet</Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
              Use the Visitor Entry tab to register a guest. The resident will be notified instantly.
            </Text>
          </View>
        ) : (
          data.recent.map((v) => <RecentVisitorRow key={v.id} visitor={v} />)
        )}
      </SectionCard>

      <Pressable
        onPress={() => load(true)}
        style={({ pressed }) => [
          styles.refreshBtn,
          { borderColor: theme.cardBorder, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={{ color: theme.accent, fontWeight: '700' }}>Refresh dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 3 },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 20 },
  refreshBtn: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
});
