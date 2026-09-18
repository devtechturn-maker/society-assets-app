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
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { VisitorApprovalActions } from '../../components/visitor/VisitorApprovalActions';
import { VisitorAvatar } from '../../components/visitor/VisitorAvatar';
import { fetchMemberVisitorDetail } from '../../services/api';
import type { VisitorDetail } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { VisitorHistoryModule } from './VisitorHistoryModule';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';

type Screen = 'list' | 'detail';

export function MemberVisitorModule({
  initialVisitorId,
  onInitialVisitorConsumed,
}: {
  initialVisitorId?: string | null;
  onInitialVisitorConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [screen, setScreen] = useState<Screen>('list');
  const [detail, setDetail] = useState<VisitorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const openDetail = useCallback(
    async (visitorId: string) => {
      setLoading(true);
      try {
        setDetail(await fetchMemberVisitorDetail(visitorId));
        setScreen('detail');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to load visitor', 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const refreshDetail = useCallback(async () => {
    if (!detail) return;
    setRefreshing(true);
    try {
      setDetail(await fetchMemberVisitorDetail(detail.id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to refresh visitor', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [detail, toast]);

  const handleVisitorResolved = useCallback(() => {
    setHistoryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (initialVisitorId) {
      openDetail(initialVisitorId).finally(() => onInitialVisitorConsumed?.());
    }
  }, [initialVisitorId, onInitialVisitorConsumed, openDetail]);

  if (screen === 'list') {
    return (
      <VisitorHistoryModule
        key={historyKey}
        member
        onVisitorPress={(visitorId) => void openDetail(visitorId)}
        onVisitorResolved={handleVisitorResolved}
      />
    );
  }

  if (loading && !detail) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!detail) return null;

  const tone = visitorStatusTone(detail.status);

  return (
    <ScrollView
      style={[styles.detail, { backgroundColor: theme.pageBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshDetail()} />}
    >
      <Pressable onPress={() => setScreen('list')} style={styles.backRow}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>Back to visitors</Text>
      </Pressable>

      <SectionCard title={detail.visitorName} subtitle={detail.purpose}>
        <View style={styles.detailHeader}>
          <VisitorAvatar visitor={detail} memberPortal size={96} expandable />
          <View style={styles.detailHeaderCopy}>
            <View style={[styles.pill, styles.detailPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <Text style={[styles.pillText, { color: tone.text }]}>{visitorStatusLabel(detail.status)}</Text>
            </View>
            <Text style={[styles.meta, { color: theme.text }]}>Mobile: {detail.mobileNumber}</Text>
            <Text style={[styles.meta, { color: theme.text }]}>Flat: {detail.flatNumber}</Text>
          </View>
        </View>

        {detail.vehicleNumber ? (
          <Text style={[styles.meta, { color: theme.text }]}>Vehicle: {detail.vehicleNumber}</Text>
        ) : null}
        {detail.visitorCount > 1 ? (
          <Text style={[styles.meta, { color: theme.text }]}>Guests: {detail.visitorCount}</Text>
        ) : null}
        {detail.rejectionReason ? (
          <Text style={[styles.rejection, { color: '#b91c1c' }]}>
            Rejection reason: {detail.rejectionReason}
          </Text>
        ) : null}
      </SectionCard>

      {detail.status === 'PENDING_APPROVAL' ? (
        <SectionCard title="Your decision" subtitle="Approve to allow entry, or reject with a reason">
          <VisitorApprovalActions
            visitorId={detail.id}
            visitorName={detail.visitorName}
            onResolved={async () => {
              handleVisitorResolved();
              setDetail(await fetchMemberVisitorDetail(detail.id));
            }}
          />
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: '800' },
  detailHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailHeaderCopy: { flex: 1, gap: 4 },
  detailPill: { alignSelf: 'flex-start', marginBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detail: { flex: 1, padding: 12 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  rejection: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
