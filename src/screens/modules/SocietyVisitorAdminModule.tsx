import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  assignGateKeeper,
  fetchChairmanVisitorDashboard,
  fetchGateKeeperAssignments,
  removeGateKeeper,
  resetGateKeeperPassword,
  setGateKeeperActive,
} from '../../services/api';
import type { ChairmanVisitorDashboard, GateKeeperAssignment, VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { KpiGrid } from '../../components/dashboard/KpiGrid';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ListError } from '../../components/dashboard/ListStates';
import { VisitorAvatar } from '../../components/visitor/VisitorAvatar';
import { VisitorHistoryModule } from './VisitorHistoryModule';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';

type Tab = 'overview' | 'history' | 'gatekeepers';

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'gatekeepers', label: 'Gate keepers', icon: 'shield-checkmark-outline' },
];

function RecentVisitorRow({ visitor }: { visitor: VisitorSummary }) {
  const { theme } = useTheme();
  const tone = visitorStatusTone(visitor.status);

  return (
    <View style={[styles.recentRow, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}>
      <VisitorAvatar visitor={visitor} photoPortal="society" size={44} expandable />
      <View style={styles.recentMain}>
        <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
          {visitor.visitorName}
        </Text>
        <Text style={[styles.recentMeta, { color: theme.textMuted }]}>
          Flat {visitor.flatNumber} · {visitor.mobileNumber}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Text style={[styles.statusText, { color: tone.text }]}>{visitorStatusLabel(visitor.status)}</Text>
      </View>
    </View>
  );
}

function GateKeeperCard({
  assignment,
  onChanged,
}: {
  assignment: GateKeeperAssignment;
  onChanged: () => void;
}) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();

  function handleRemove() {
    confirm({
      title: 'Remove gate keeper?',
      message: `${assignment.displayName} will lose gate access for this society.`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await removeGateKeeper(assignment.id);
          toast('Gate keeper removed', 'success');
          onChanged();
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Remove failed', 'error');
        }
      },
    });
  }

  return (
    <View style={[styles.gkCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <View style={styles.gkHeader}>
        <View style={[styles.gkAvatar, { backgroundColor: theme.accentSoft, borderColor: theme.accentGold }]}>
          <Ionicons name="person-outline" size={22} color={theme.accentGold} />
        </View>
        <View style={styles.gkCopy}>
          <Text style={[styles.gkName, { color: theme.text }]}>{assignment.displayName}</Text>
          <Text style={[styles.gkPhone, { color: theme.textMuted }]}>{assignment.phone}</Text>
        </View>
        <View
          style={[
            styles.gkStatus,
            {
              backgroundColor: assignment.active ? 'rgba(16, 185, 129, 0.12)' : theme.chipBg,
              borderColor: assignment.active ? 'rgba(16, 185, 129, 0.35)' : theme.cardBorder,
            },
          ]}
        >
          <Text style={{ color: assignment.active ? '#059669' : theme.textMuted, fontSize: 11, fontWeight: '700' }}>
            {assignment.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.gkActions}>
        <Pressable
          onPress={() => setGateKeeperActive(assignment.id, !assignment.active).then(onChanged)}
          style={[styles.gkActionBtn, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}
        >
          <Ionicons name={assignment.active ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={theme.accent} />
          <Text style={[styles.gkActionText, { color: theme.accent }]}>
            {assignment.active ? 'Deactivate' : 'Activate'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            resetGateKeeperPassword(assignment.id).then(() => toast('Password reset sent', 'success'))
          }
          style={[styles.gkActionBtn, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}
        >
          <Ionicons name="key-outline" size={16} color={theme.accent} />
          <Text style={[styles.gkActionText, { color: theme.accent }]}>Reset password</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleRemove()}
          style={[styles.gkActionBtn, { borderColor: 'rgba(239, 68, 68, 0.35)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
        >
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={[styles.gkActionText, { color: '#dc2626' }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SocietyVisitorAdminModule() {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<ChairmanVisitorDashboard | null>(null);
  const [assignments, setAssignments] = useState<GateKeeperAssignment[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [dash, list] = await Promise.all([fetchChairmanVisitorDashboard(), fetchGateKeeperAssignments()]);
      setDashboard(dash);
      setAssignments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAssign() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || trimmedPhone.length < 10) {
      toast('Enter security name and a valid 10-digit mobile number', 'error');
      return;
    }
    setAssigning(true);
    try {
      await assignGateKeeper({ name: trimmedName, phone: trimmedPhone });
      toast('Gate keeper assigned', 'success');
      setName('');
      setPhone('');
      await load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Assign failed', 'error');
    } finally {
      setAssigning(false);
    }
  }

  if (loading && !dashboard) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (error && !dashboard) {
    return <ListError message={error} onRetry={() => load()} />;
  }

  const overviewContent = dashboard ? (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.pageBg }]}
      contentContainerStyle={styles.overviewContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Visitors</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Monitor gate activity, review history, and manage security staff
      </Text>

      <KpiGrid
        items={[
          { label: 'Today', value: dashboard.todayTotal, isCurrency: false },
          { label: 'Pending', value: dashboard.pending, isCurrency: false, highlight: dashboard.pending > 0 },
          { label: 'Approved', value: dashboard.approved, isCurrency: false },
          { label: 'Rejected', value: dashboard.rejected, isCurrency: false },
        ]}
      />

      <SectionCard
        title="Today's log"
        subtitle={
          dashboard.recentLogs.length === 0
            ? 'No visitor entries recorded today'
            : 'Latest registrations across all flats'
        }
        headerRight={
          <Pressable onPress={() => setTab('history')} hitSlop={8}>
            <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>View all</Text>
          </Pressable>
        }
      >
        {dashboard.recentLogs.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}>
            <Ionicons name="people-outline" size={28} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No visitors today</Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
              Entries registered by gate keepers will appear here in real time.
            </Text>
          </View>
        ) : (
          dashboard.recentLogs.map((visitor) => <RecentVisitorRow key={visitor.id} visitor={visitor} />)
        )}
      </SectionCard>

      <SectionCard
        title="Quick actions"
        subtitle="Jump to the most common visitor management tasks"
      >
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => setTab('history')}
            style={[styles.quickAction, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}
          >
            <Ionicons name="time-outline" size={22} color={theme.accentGold} />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Visitor history</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('gatekeepers')}
            style={[styles.quickAction, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.accentGold} />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Gate keepers</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScrollView>
  ) : null;

  const gatekeepersContent = (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.pageBg }]}
      contentContainerStyle={styles.gatekeepersContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.accent} />}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard
        title="Assign gate keeper"
        subtitle="Security staff log in with their mobile number to register visitors at the gate"
      >
        <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Security staff name"
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
        />
        <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Mobile number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit mobile"
          keyboardType="phone-pad"
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
        />
        <Pressable
          onPress={() => void handleAssign()}
          disabled={assigning}
          style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: assigning ? 0.7 : 1 }]}
        >
          {assigning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Add gate keeper</Text>
            </>
          )}
        </Pressable>
      </SectionCard>

      <SectionCard
        title="Active gate keepers"
        subtitle={
          assignments.length === 0
            ? 'No security accounts assigned yet'
            : `${assignments.filter((g) => g.active).length} active of ${assignments.length} total`
        }
      >
        {assignments.length === 0 ? (
          <Text style={[styles.emptyInline, { color: theme.textMuted }]}>
            Add your first gate keeper to start registering visitors from the security desk.
          </Text>
        ) : (
          assignments.map((g) => <GateKeeperCard key={g.id} assignment={g} onChanged={() => load(true)} />)
        )}
      </SectionCard>
    </ScrollView>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.pageBg }]}>
      <View style={[styles.tabBar, { borderBottomColor: theme.divider, backgroundColor: theme.pageBg }]}>
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                  borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={active ? theme.accent : theme.textMuted} />
              <Text style={{ color: active ? theme.accent : theme.textMuted, fontWeight: '700', fontSize: 12 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'overview' ? overviewContent : null}
      {tab === 'history' ? (
        <View style={styles.historyPane}>
          <VisitorHistoryModule chairman />
        </View>
      ) : null}
      {tab === 'gatekeepers' ? gatekeepersContent : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  historyPane: { flex: 1, minHeight: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  overviewContent: { padding: 12, paddingBottom: 28 },
  gatekeepersContent: { padding: 12, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentMain: { flex: 1, minWidth: 0 },
  recentName: { fontSize: 15, fontWeight: '700' },
  recentMeta: { fontSize: 12, marginTop: 2 },
  statusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyInline: { fontSize: 14, lineHeight: 20 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  quickActionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  gkCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  gkHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gkAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gkCopy: { flex: 1, minWidth: 0 },
  gkName: { fontSize: 16, fontWeight: '800' },
  gkPhone: { fontSize: 13, marginTop: 2 },
  gkStatus: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  gkActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gkActionText: { fontSize: 12, fontWeight: '700' },
});
