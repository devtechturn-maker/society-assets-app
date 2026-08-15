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
import { fetchGateKeeperDashboard } from '../../services/api';
import type { GateKeeperDashboard, VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListError } from '../../components/dashboard/ListStates';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { VisitorAvatar } from '../../components/visitor/VisitorAvatar';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';

function RecentVisitorRow({ visitor }: { visitor: VisitorSummary }) {
  const { theme } = useTheme();
  const tone = visitorStatusTone(visitor.status);
  return (
    <View style={[styles.row, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}>
      <VisitorAvatar visitor={visitor} memberPortal={false} size={44} />
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {visitor.visitorName}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
          Flat {visitor.flatNumber} · {visitor.mobileNumber}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Text style={[styles.statusText, { color: tone.text }]}>{visitorStatusLabel(visitor.status)}</Text>
      </View>
    </View>
  );
}

export function GateKeeperDashboardModule() {
  const { theme } = useTheme();
  const [data, setData] = useState<GateKeeperDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setData(await fetchGateKeeperDashboard());
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
