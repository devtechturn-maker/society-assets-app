import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { PayMaintenanceButton } from '../../components/payment/PayMaintenanceButton';
import { VisitorApprovalActions } from '../../components/visitor/VisitorApprovalActions';
import { VisitorAvatar } from '../../components/visitor/VisitorAvatar';
import {
  fetchMemberMaintenanceDue,
  fetchMemberOverview,
  fetchMemberPendingVisitors,
  fetchMemberProfile,
  fetchNotices,
} from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

const VISITOR_ALERT_BORDER = '#D8B4E8';

type Props = {
  onOpenProfile?: () => void;
  onOpenNotice?: (noticeId: string) => void;
  onOpenVisitors?: (visitorId?: string) => void;
};

export function MemberDashboardModule({ onOpenProfile, onOpenNotice, onOpenVisitors }: Props) {
  const { theme } = useTheme();
  const overview = useAsyncLoad(fetchMemberOverview, []);
  const due = useAsyncLoad(fetchMemberMaintenanceDue, []);
  const profile = useAsyncLoad(fetchMemberProfile, []);
  const notices = useAsyncLoad(() => fetchNotices(true), []);
  const pendingVisitors = useAsyncLoad(fetchMemberPendingVisitors, []);

  const showVerifyPrompt = profile.data?.emailVerificationRequired === true;
  const recentNotices = useMemo(() => (notices.data ?? []).slice(0, 2), [notices.data]);
  const pendingAmount = overview.data?.remainingDueAmount ?? 0;
  const highlightPending = pendingAmount > 0;
  const visitorsAwaiting = pendingVisitors.data ?? [];

  function refreshAll() {
    void overview.refresh();
    void due.refresh();
    void profile.refresh();
    void notices.refresh();
    void pendingVisitors.refresh();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={
            overview.refreshing ||
            due.refreshing ||
            profile.refreshing ||
            notices.refreshing ||
            pendingVisitors.refreshing
          }
          onRefresh={refreshAll}
        />
      }
    >
      {visitorsAwaiting.length > 0 ? (
        <View
          style={[
            styles.visitorAlert,
            { backgroundColor: theme.cardBg, borderColor: VISITOR_ALERT_BORDER },
          ]}
        >
          <View style={styles.visitorAlertHeader}>
            <Ionicons name="people-outline" size={24} color={theme.accent} />
            <View style={styles.visitorAlertCopy}>
              <Text style={[styles.visitorAlertTitle, { color: theme.accent }]}>
                {visitorsAwaiting.length === 1
                  ? 'Visitor waiting at gate'
                  : `${visitorsAwaiting.length} visitors waiting at gate`}
              </Text>
              <Text style={[styles.visitorAlertBody, { color: theme.textMuted }]}>
                Approve or reject entry from your dashboard. Security will be notified of your decision.
              </Text>
            </View>
          </View>

          {visitorsAwaiting.map((visitor) => (
            <View key={visitor.id} style={styles.visitorCard}>
              <View style={styles.visitorHeader}>
                <VisitorAvatar visitor={visitor} memberPortal size={52} expandable />
                <Pressable style={styles.visitorCopy} onPress={() => onOpenVisitors?.(visitor.id)}>
                  <Text style={[styles.visitorName, { color: theme.text }]}>{visitor.visitorName}</Text>
                  <Text style={[styles.visitorMeta, { color: theme.textMuted }]}>
                    Flat {visitor.flatNumber} · {visitor.purpose}
                  </Text>
                  {visitor.vehicleNumber ? (
                    <Text style={[styles.visitorMeta, { color: theme.textMuted }]}>
                      Vehicle: {visitor.vehicleNumber}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
              <VisitorApprovalActions
                visitorId={visitor.id}
                visitorName={visitor.visitorName}
                onResolved={refreshAll}
              />
            </View>
          ))}

          <Pressable style={styles.viewAllBtn} onPress={() => onOpenVisitors?.()}>
            <Text style={[styles.viewAllText, { color: theme.accentGold }]}>Open all visitors</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.accentGold} />
          </Pressable>
        </View>
      ) : null}

      {showVerifyPrompt ? (
        <View style={[styles.verifyCard, { backgroundColor: theme.accentSoft, borderColor: theme.accentGold }]}>
          <View style={styles.verifyCardHeader}>
            <Ionicons name="mail-unread-outline" size={24} color={theme.accentGold} />
            <View style={styles.verifyCardCopy}>
              <Text style={[styles.verifyCardTitle, { color: theme.text }]}>Verify your email</Text>
              <Text style={[styles.verifyCardBody, { color: theme.textMuted }]}>
                Confirm your email address to use password change and other features.
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.verifyCardBtn, { backgroundColor: theme.accent }]}
            onPress={onOpenProfile}
          >
            <Text style={styles.verifyCardBtnText}>Go to verify email</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {overview.loading ? <ListLoading /> : null}
      {overview.error ? <ListError message={overview.error} /> : null}
      {overview.data ? (
        <KpiGrid
          columns={3}
          items={[
            { label: 'Last Payment', value: overview.data.lastPaymentAmount },
            { label: 'Total Due', value: overview.data.totalDueAmount },
            {
              label: 'Pending',
              value: overview.data.remainingDueAmount,
              highlight: highlightPending,
            },
          ]}
        />
      ) : null}

      {recentNotices.length > 0 ? (
        <SectionCard title="Recent notices" subtitle="Latest updates from your society">
          {recentNotices.map((notice, index) => (
            <Pressable
              key={notice.noticeId}
              style={[
                styles.noticeRow,
                index > 0 ? { borderTopColor: theme.divider, borderTopWidth: 1 } : null,
              ]}
              onPress={() => onOpenNotice?.(notice.noticeId)}
              accessibilityLabel={`Open notice: ${notice.subject}`}
            >
              <Ionicons name="megaphone-outline" size={18} color={theme.accentGold} />
              <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={2}>
                {notice.subject}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </SectionCard>
      ) : null}

      {overview.data ? (
        <SectionCard
          title="Pay maintenance"
          subtitle={
            due.data?.canPayOnline
              ? 'Pay your society maintenance securely online'
              : 'Online payment will be available once your chairman completes society bank setup'
          }
        >
          <PayMaintenanceButton
            due={due.data}
            onPaid={() => {
              void overview.refresh();
              void due.refresh();
            }}
          />
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 18 },
  visitorAlert: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  visitorAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  visitorAlertCopy: { flex: 1, gap: 4 },
  visitorAlertTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  visitorAlertBody: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  visitorCard: {
    gap: 12,
    paddingTop: 4,
  },
  visitorHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  visitorCopy: { flex: 1, minWidth: 0 },
  visitorName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  visitorMeta: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verifyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  verifyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  verifyCardCopy: { flex: 1, gap: 4 },
  verifyCardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  verifyCardBody: { fontSize: 13, lineHeight: 19, letterSpacing: 0.1 },
  verifyCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
  },
  verifyCardBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
