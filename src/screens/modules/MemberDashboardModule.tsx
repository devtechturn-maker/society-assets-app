import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { PayMaintenanceButton } from '../../components/payment/PayMaintenanceButton';
import { fetchMemberMaintenanceDue, fetchMemberOverview, fetchMemberProfile } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  onOpenProfile?: () => void;
};

export function MemberDashboardModule({ onOpenProfile }: Props) {
  const { theme } = useTheme();
  const overview = useAsyncLoad(fetchMemberOverview, []);
  const due = useAsyncLoad(fetchMemberMaintenanceDue, []);
  const profile = useAsyncLoad(fetchMemberProfile, []);

  const showVerifyPrompt = profile.data?.emailVerificationRequired === true;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={overview.refreshing || due.refreshing || profile.refreshing}
          onRefresh={() => {
            void overview.refresh();
            void due.refresh();
            void profile.refresh();
          }}
        />
      }
    >
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
        <>
          <SectionCard title="Your flat">
            <View style={styles.metaBlock}>
              <Text style={[styles.metaLine, { color: theme.textPrimary }]}>
                {overview.data.memberName} · Flat {overview.data.flatNumber}
              </Text>
              <Text style={[styles.metaSub, { color: theme.textMuted }]}>
                {overview.data.societyName}
              </Text>
            </View>
          </SectionCard>
          <KpiGrid
            items={[
              { label: 'Last payment', value: overview.data.lastPaymentAmount },
              { label: 'Total due', value: overview.data.totalDueAmount },
              { label: 'Pending', value: overview.data.remainingDueAmount },
            ]}
          />
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
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32, gap: 12 },
  verifyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  verifyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  verifyCardCopy: { flex: 1, gap: 4 },
  verifyCardTitle: { fontSize: 16, fontWeight: '800' },
  verifyCardBody: { fontSize: 13, lineHeight: 18 },
  verifyCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
  },
  verifyCardBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaBlock: { paddingVertical: 4 },
  metaLine: { fontSize: 16, fontWeight: '600' },
  metaSub: { marginTop: 4, fontSize: 14 },
});
