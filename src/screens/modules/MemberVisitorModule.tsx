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
import { cancelGuestPass, fetchMemberOverview, fetchMemberVisitorDetail } from '../../services/api';
import type { MemberOverview, VisitorDetail } from '../../types/api';
import { AddGuestForm } from '../../components/visitor/AddGuestForm';
import { apiErrorMessage } from '../../utils/apiError';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { VisitorHistoryModule } from './VisitorHistoryModule';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';

type Screen = 'list' | 'detail' | 'add';

function when(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

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
  const [overview, setOverview] = useState<MemberOverview | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchMemberOverview().then(setOverview).catch(() => setOverview(null));
  }, []);

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

  // While the flat is rented out, the tenant handles guests; the owner keeps everything else.
  if (overview?.occupancy === 'OWNER_RENTED_OUT') {
    return (
      <ScrollView style={[styles.detail, { backgroundColor: theme.pageBg }]}>
        <SectionCard title="Your flat is rented out" subtitle={`Flat ${overview.flatNumber}`}>
          <Text style={[styles.meta, { color: theme.text }]}>
            Visitors and guests for this flat are handled by your current tenant. You remain the owner, and
            maintenance and your other society features are unchanged.
          </Text>
        </SectionCard>
      </ScrollView>
    );
  }

  if (screen === 'add') {
    return (
      <ScrollView style={[styles.detail, { backgroundColor: theme.pageBg }]} keyboardShouldPersistTaps="handled">
        <AddGuestForm
          onAdded={() => {
            handleVisitorResolved();
            setScreen('list');
          }}
          onCancel={() => setScreen('list')}
        />
      </ScrollView>
    );
  }

  if (screen === 'list') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <View style={styles.addBar}>
          {overview?.occupancy === 'TENANT' ? (
            <Text style={[styles.addHint, { color: theme.textMuted }]}>
              Tenant of {overview.flatNumber}
              {overview.rentalEndDate ? ` until ${overview.rentalEndDate}` : ''}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => setScreen('add')}
            style={({ pressed }) => [styles.addButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add guest</Text>
          </Pressable>
        </View>
        <VisitorHistoryModule
          key={historyKey}
          member
          onVisitorPress={(visitorId) => void openDetail(visitorId)}
          onVisitorResolved={handleVisitorResolved}
        />
      </View>
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
        {detail.addedByResident ? (
          <>
            <Text style={[styles.meta, { color: theme.text }]}>
              Guest pass: {when(detail.validFrom)} to {when(detail.validUntil)}
            </Text>
            {detail.guestRelationship ? (
              <Text style={[styles.meta, { color: theme.text }]}>Relationship: {detail.guestRelationship}</Text>
            ) : null}
            {detail.addedByName ? (
              <Text style={[styles.meta, { color: theme.text }]}>Added by: {detail.addedByName}</Text>
            ) : null}
          </>
        ) : null}
        {detail.rejectionReason ? (
          <Text style={[styles.rejection, { color: '#b91c1c' }]}>
            Rejection reason: {detail.rejectionReason}
          </Text>
        ) : null}
      </SectionCard>

      {detail.addedByResident && detail.status === 'APPROVED' ? (
        <SectionCard title="Guest pass" subtitle="Cancel if the guest is no longer coming">
          <Pressable
            disabled={cancelling}
            onPress={async () => {
              setCancelling(true);
              try {
                setDetail(await cancelGuestPass(detail.id));
                handleVisitorResolved();
                toast('Guest pass cancelled', 'success');
              } catch (e) {
                toast(apiErrorMessage(e, 'Could not cancel the guest pass'), 'error');
              } finally {
                setCancelling(false);
              }
            }}
            style={({ pressed }) => [styles.cancelPass, { opacity: cancelling ? 0.6 : pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.cancelPassText}>{cancelling ? 'Cancelling…' : 'Cancel guest pass'}</Text>
          </Pressable>
        </SectionCard>
      ) : null}

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
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  addHint: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cancelPass: {
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelPassText: { color: '#b91c1c', fontWeight: '800' },
  rejection: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
