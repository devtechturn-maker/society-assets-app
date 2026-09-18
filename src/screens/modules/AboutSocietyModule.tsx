import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchAboutSociety, fetchRuleDetail, fetchRules } from '../../services/api';
import type { RuleDetail, RuleSummary, SocietyProfile } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty } from '../../components/dashboard/ListStates';

type SectionKey = 'profile' | 'rules';

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function AccordionSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.accordion, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
      <Pressable style={styles.accordionHead} onPress={onToggle}>
        <Text style={[styles.accordionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.accordionChevron, { color: theme.textMuted }]}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const { theme } = useTheme();
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View style={styles.profileField}>
      <Text style={[styles.profileLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: theme.text }]}>{display}</Text>
    </View>
  );
}

type Props = {
  memberPortal?: boolean;
  initialRuleId?: string | null;
  onInitialRuleConsumed?: () => void;
};

export function AboutSocietyModule({
  memberPortal = false,
  initialRuleId,
  onInitialRuleConsumed,
}: Props) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({ profile: false, rules: false });
  const [profile, setProfile] = useState<SocietyProfile | null>(null);
  const [rules, setRules] = useState<RuleSummary[]>([]);
  const [activeRule, setActiveRule] = useState<RuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profileData, rulesData] = await Promise.all([
        fetchAboutSociety(memberPortal),
        fetchRules(memberPortal),
      ]);
      setProfile(profileData);
      setRules(rulesData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberPortal]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!initialRuleId) return;
    void (async () => {
      try {
        const detail = await fetchRuleDetail(memberPortal, initialRuleId);
        setActiveRule(detail);
        setExpanded((current) => ({ ...current, rules: true }));
      } finally {
        onInitialRuleConsumed?.();
      }
    })();
  }, [initialRuleId, memberPortal, onInitialRuleConsumed]);

  function toggleSection(section: SectionKey) {
    setExpanded((current) => ({ ...current, [section]: !current[section] }));
  }

  if (activeRule) {
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}>
        <Pressable onPress={() => setActiveRule(null)} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back to rules</Text>
        </Pressable>
        <Text style={[styles.ruleTitle, { color: theme.text }]}>{activeRule.subject}</Text>
        <Text style={[styles.ruleMeta, { color: theme.textMuted }]}>
          {activeRule.createdByName ? `Published by ${activeRule.createdByName}` : ''}
          {activeRule.createdAt ? ` · ${formatWhen(activeRule.createdAt)}` : ''}
        </Text>
        <View style={[styles.ruleDetailBox, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
          <Text style={[styles.ruleDetailLabel, { color: theme.text }]}>Description</Text>
          <Text style={[styles.ruleDetailBody, { color: theme.textSoft }]}>{activeRule.description}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadData();
          }}
        />
      }
    >
      <Text style={[styles.pageTitle, { color: theme.text }]}>About Society</Text>
      <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>
        Society profile and published rules for residents.
      </Text>

      {loading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}

      {!loading && profile ? (
        <AccordionSection
          title="About Society"
          expanded={expanded.profile}
          onToggle={() => toggleSection('profile')}
        >
          <ProfileField label="Society name" value={profile.name} />
          <ProfileField label="Address" value={profile.address} />
          <ProfileField label="City" value={profile.city} />
          <ProfileField label="State" value={profile.state} />
          <ProfileField label="Postal code" value={profile.postalCode} />
          <ProfileField label="Year established" value={profile.yearEstablished} />
          <ProfileField label="Total blocks / wings" value={profile.totalBlocks} />
          <ProfileField label="Total flats" value={profile.totalFlats} />
          <ProfileField label="Registration number" value={profile.registrationNumber} />
          <ProfileField label="About" value={profile.aboutDescription} />
          <ProfileField label="Amenities & facilities" value={profile.amenitiesSummary} />
          <ProfileField label="Contact email" value={profile.contactEmail} />
          <ProfileField label="Contact phone" value={profile.contactPhone} />
        </AccordionSection>
      ) : null}

      {!loading ? (
        <AccordionSection title="Rules" expanded={expanded.rules} onToggle={() => toggleSection('rules')}>
          {rules.length === 0 ? <ListEmpty message="No rules published yet." /> : null}
          {rules.map((rule) => (
            <Pressable
              key={rule.ruleId}
              style={[styles.ruleCard, { borderColor: theme.divider, backgroundColor: theme.pageBg }]}
              onPress={() => {
                void fetchRuleDetail(memberPortal, rule.ruleId).then(setActiveRule);
              }}
            >
              <Text style={[styles.ruleCardTitle, { color: theme.text }]}>{rule.subject}</Text>
              <Text style={[styles.ruleCardMeta, { color: theme.textSoft }]} numberOfLines={2}>
                {rule.description}
              </Text>
              <Text style={[styles.ruleCardTime, { color: theme.textMuted }]}>{formatWhen(rule.createdAt)}</Text>
            </Pressable>
          ))}
        </AccordionSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  loader: { marginVertical: 24 },
  accordion: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionTitle: { fontSize: 16, fontWeight: '700' },
  accordionChevron: { fontSize: 16, fontWeight: '700' },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  profileField: { gap: 4 },
  profileLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  profileValue: { fontSize: 15, lineHeight: 22 },
  ruleCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  ruleCardTitle: { fontSize: 15, fontWeight: '700' },
  ruleCardMeta: { fontSize: 13, lineHeight: 18 },
  ruleCardTime: { fontSize: 12 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '600' },
  ruleTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  ruleMeta: { fontSize: 12, marginBottom: 12 },
  ruleDetailBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  ruleDetailLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  ruleDetailBody: { fontSize: 15, lineHeight: 22 },
});
