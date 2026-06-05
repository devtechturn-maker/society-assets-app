import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  fetchSocietySubscriptionPlans,
  fetchSubscriptionStatus,
  quoteSubscriptionUpgrade,
} from '../../services/api';
import type {
  PublicSubscriptionPlan,
  SocietySubscriptionStatus,
  UpgradeQuote,
} from '../../types/api';
import { WEB_PORTAL_URL } from '../../config/env';
import { useTheme } from '../../theme/ThemeContext';
import { colors } from '../../theme/colors';
import {
  canBuyExtraMembers,
  formatPlanPrice,
  memberLimitLabel,
  planCycleLabel,
} from '../../utils/subscriptionPlan';

export function SubscriptionModule() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<SocietySubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PublicSubscriptionPlan | null>(null);
  const [upgradeTargetSlots, setUpgradeTargetSlots] = useState(0);
  const [upgradeQuote, setUpgradeQuote] = useState<UpgradeQuote | null>(null);

  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<PublicSubscriptionPlan | null>(null);
  const [upgradeAdditionalInput, setUpgradeAdditionalInput] = useState('0');

  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [buyAdditionalInput, setBuyAdditionalInput] = useState('1');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([fetchSubscriptionStatus(), fetchSocietySubscriptionPlans()]);
      setStatus(s);
      setPlans(p);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function upgradePlans(): PublicSubscriptionPlan[] {
    if (!status?.planId) return plans;
    return plans.filter((p) => p.id !== status.planId);
  }

  function memberUsageLabel(): string {
    if (!status) return '';
    if (status.unlimitedMembers) return 'Unlimited members';
    return `${status.currentMemberCount ?? 0} / ${status.effectiveMemberLimit} members`;
  }

  function onUpgradeCardPress(plan: PublicSubscriptionPlan) {
    if (canBuyExtraMembers(plan)) {
      setPendingUpgradePlan(plan);
      setUpgradeAdditionalInput(String(status?.additionalMemberSlots ?? 0));
      setUpgradeModalVisible(true);
      return;
    }
    selectUpgradePlan(plan, 0);
  }

  function selectUpgradePlan(plan: PublicSubscriptionPlan, slots: number) {
    setSelectedUpgradePlan(plan);
    setUpgradeTargetSlots(slots);
    setUpgradeQuote(null);
    quoteSubscriptionUpgrade(plan.id, slots)
      .then(setUpgradeQuote)
      .catch(() => setUpgradeQuote(null));
  }

  function confirmUpgradeModal() {
    if (!pendingUpgradePlan) return;
    const slots = Math.max(0, parseInt(upgradeAdditionalInput, 10) || 0);
    setUpgradeModalVisible(false);
    selectUpgradePlan(pendingUpgradePlan, slots);
    setPendingUpgradePlan(null);
  }

  function openWebSubscription() {
    const url = `${WEB_PORTAL_URL.replace(/\/$/, '')}/subscription`;
    Linking.openURL(url).catch(() => undefined);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Current plan</Text>
      {status ? (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.planName, { color: theme.text }]}>{status.planName}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            ₹{Math.round(status.price ?? 0).toLocaleString('en-IN')}
            {status.billingCycle === 'MONTHLY' ? ' / month' : ' / year'} · {memberUsageLabel()}
          </Text>
          {(status.additionalMemberSlots ?? 0) > 0 ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Extra slots: {status.additionalMemberSlots}
            </Text>
          ) : null}
        </View>
      ) : null}

      {status && !status.unlimitedMembers && (status.additionalMemberPrice ?? 0) > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Buy additional members</Text>
          <Pressable
            style={[styles.planCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            onPress={() => {
    setBuyAdditionalInput('1');
    setBuyModalVisible(true);
            }}
          >
            <Text style={[styles.planCardName, { color: theme.text }]}>Add members</Text>
            <Text style={[styles.planCardExtra, { color: theme.accentGold }]}>
              + ₹{Math.round(status.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per member
            </Text>
            <Text style={[styles.planCardCta, { color: theme.accent }]}>Tap to choose count →</Text>
          </Pressable>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Upgrade plan</Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Tap a plan to upgrade. Complete payment on the website when ready.
      </Text>

      <View style={styles.cardGrid}>
        {upgradePlans().map((plan) => (
          <Pressable
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              selectedUpgradePlan?.id === plan.id && styles.planCardSelected,
            ]}
            onPress={() => onUpgradeCardPress(plan)}
          >
            <Text style={[styles.planCardName, { color: theme.text }]}>{plan.name}</Text>
            <Text style={[styles.planCardPrice, { color: theme.accent }]}>{formatPlanPrice(plan)}</Text>
            <Text style={[styles.planCardMeta, { color: theme.textMuted }]}>{memberLimitLabel(plan)}</Text>
            {canBuyExtraMembers(plan) ? (
              <Text style={[styles.planCardExtra, { color: theme.accentGold }]}>
                + ₹{Math.round(plan.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per additional member
              </Text>
            ) : null}
            <Text style={[styles.planCardCta, { color: theme.accent }]}>Select →</Text>
          </Pressable>
        ))}
      </View>

      {selectedUpgradePlan ? (
        <Text style={[styles.selectedLine, { color: theme.text }]}>
          Selected: {selectedUpgradePlan.name}
          {upgradeTargetSlots > 0 ? ` · ${upgradeTargetSlots} additional members` : ''}
        </Text>
      ) : null}

      <Pressable style={[styles.payWebBtn, { backgroundColor: theme.accent }]} onPress={openWebSubscription}>
        <Text style={styles.payWebBtnText}>Complete payment on website</Text>
      </Pressable>
      <Text style={[styles.payHint, { color: theme.textMuted }]}>
        Open the Society Assets web portal (same email login) to pay with Razorpay after selecting a plan here.
      </Text>

      <UpgradeModal
        visible={upgradeModalVisible}
        plan={pendingUpgradePlan}
        value={upgradeAdditionalInput}
        onChange={setUpgradeAdditionalInput}
        onCancel={() => {
          setUpgradeModalVisible(false);
          setPendingUpgradePlan(null);
        }}
        onConfirm={confirmUpgradeModal}
      />

      <BuyAdditionalModal
        visible={buyModalVisible}
        status={status}
        value={buyAdditionalInput}
        onChange={setBuyAdditionalInput}
        onPayWeb={() => {
          setBuyModalVisible(false);
          openWebSubscription();
        }}
        onCancel={() => setBuyModalVisible(false)}
      />
    </ScrollView>
  );
}

function UpgradeModal({
  visible,
  plan,
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  plan: PublicSubscriptionPlan | null;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Additional members on new plan</Text>
          {plan ? (
            <>
              <Text style={styles.modalPlan}>{plan.name}</Text>
              <Text style={styles.modalSub}>
                Includes {plan.memberLimit} members. How many additional members do you want on this plan?
              </Text>
              <Text style={styles.modalRate}>
                ₹{Math.round(plan.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per additional member
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
              />
            </>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable style={styles.modalBtnGhost} onPress={onCancel}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalBtnPrimary} onPress={onConfirm}>
              <Text style={styles.modalBtnPrimaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function BuyAdditionalModal({
  visible,
  status,
  value,
  onChange,
  onPayWeb,
  onCancel,
}: {
  visible: boolean;
  status: SocietySubscriptionStatus | null;
  value: string;
  onChange: (v: string) => void;
  onPayWeb: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Buy additional members</Text>
          {status ? (
            <>
              <Text style={styles.modalSub}>
                Plan includes {status.memberLimit} members. How many additional members do you want to add?
              </Text>
              <Text style={styles.modalRate}>
                ₹{Math.round(status.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per additional member
              </Text>
              <TextInput style={styles.modalInput} keyboardType="number-pad" value={value} onChangeText={onChange} />
            </>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable style={styles.modalBtnGhost} onPress={onCancel}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalBtnPrimary} onPress={onPayWeb}>
              <Text style={styles.modalBtnPrimaryText}>Pay on website</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  planName: { fontSize: 18, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 6 },
  cardGrid: { gap: 12 },
  planCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  planCardSelected: { borderColor: colors.navy800, borderWidth: 2 },
  planCardName: { fontSize: 17, fontWeight: '800' },
  planCardPrice: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  planCardMeta: { fontSize: 13, marginTop: 4 },
  planCardExtra: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  planCardCta: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  selectedLine: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  payWebBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  payWebBtnText: { color: '#fff', fontWeight: '800' },
  payHint: { fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalPlan: { fontSize: 16, fontWeight: '700', marginTop: 8, color: colors.navy800 },
  modalSub: { fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  modalRate: { marginTop: 8, fontSize: 13, fontWeight: '600', color: colors.gold600 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalBtnPrimary: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.navy800,
  },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
});
