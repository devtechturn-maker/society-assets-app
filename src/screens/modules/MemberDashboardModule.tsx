import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ChangePasswordFlow } from '../../components/ChangePasswordFlow';
import { fetchMemberOverview } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';

export function MemberDashboardModule() {
  const { theme } = useTheme();
  const overview = useAsyncLoad(fetchMemberOverview, []);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={overview.refreshing} onRefresh={overview.refresh} />
      }
    >
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
        </>
      ) : null}

      <ChangePasswordFlow />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  metaBlock: { paddingVertical: 4 },
  metaLine: { fontSize: 16, fontWeight: '600' },
  metaSub: { marginTop: 4, fontSize: 14 },
});
