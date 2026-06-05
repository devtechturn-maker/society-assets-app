import { useEffect, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { WEB_PORTAL_URL } from '../config/env';
import { fetchPublicPlans } from '../services/api';
import type { PublicSubscriptionPlan } from '../types/api';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme/colors';
import {
  canBuyExtraMembers,
  formatPlanPrice,
  memberLimitLabel,
} from '../utils/subscriptionPlan';

type Props = {
  onBack: () => void;
};

export function PlansScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingPlan, setPendingPlan] = useState<PublicSubscriptionPlan | null>(null);
  const [additionalCount, setAdditionalCount] = useState('0');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPlans()
      .then((list) => {
        if (!cancelled) {
          setPlans(list);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load plans. Check API connection and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openRegister(planId: string, extraSlots: number) {
    const base = WEB_PORTAL_URL.replace(/\/$/, '');
    const params = new URLSearchParams({ planId });
    if (extraSlots > 0) {
      params.set('additionalMemberSlots', String(extraSlots));
    }
    Linking.openURL(`${base}/register?${params.toString()}`).catch(() => undefined);
  }

  function openLanding() {
    Linking.openURL(WEB_PORTAL_URL).catch(() => undefined);
  }

  function onPlanPress(plan: PublicSubscriptionPlan) {
    if (canBuyExtraMembers(plan)) {
      setPendingPlan(plan);
      setAdditionalCount('0');
      setModalVisible(true);
      return;
    }
    openRegister(plan.id, 0);
  }

  function closeModal() {
    setModalVisible(false);
    setPendingPlan(null);
    setAdditionalCount('0');
  }

  function confirmAdditionalAndRegister() {
    if (!pendingPlan) return;
    const count = Math.max(0, parseInt(additionalCount, 10) || 0);
    setModalVisible(false);
    openRegister(pendingPlan.id, count);
    setPendingPlan(null);
    setAdditionalCount('0');
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <StatusBar style="light" />
      <LinearGradient colors={[...theme.headerGradient]} style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to login</Text>
        </Pressable>
        <Text style={styles.headerKicker}>NEW SOCIETY</Text>
        <Text style={styles.headerTitle}>Choose a subscription plan</Text>
        <Text style={styles.headerSub}>
          Tap a plan card. If it supports extra members, tell us how many you need, then complete registration on the
          web.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : error ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchPublicPlans()
                  .then(setPlans)
                  .catch(() => setError('Could not load plans.'))
                  .finally(() => setLoading(false));
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.messageBox}>
            <Text style={styles.mutedText}>No plans available yet. Contact the platform admin.</Text>
            <Pressable style={styles.primaryBtn} onPress={openLanding}>
              <Text style={styles.primaryBtnText}>Open website</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [styles.planCard, pressed && styles.planPressed]}
                onPress={() => onPlanPress(plan)}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{formatPlanPrice(plan)}</Text>
                <Text style={styles.planMeta}>{memberLimitLabel(plan)}</Text>
                {canBuyExtraMembers(plan) ? (
                  <Text style={styles.planExtra}>
                    + ₹{Math.round(plan.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per additional member
                  </Text>
                ) : null}
                {plan.description ? (
                  <Text style={styles.planDesc} numberOfLines={2}>
                    {plan.description}
                  </Text>
                ) : null}
                <Text style={styles.planCta}>Select this plan →</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable style={styles.secondaryLink} onPress={openLanding}>
          <Text style={styles.secondaryLinkText}>Browse full website</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Additional members</Text>
            {pendingPlan ? (
              <>
                <Text style={styles.modalPlan}>{pendingPlan.name}</Text>
                <Text style={styles.modalSub}>
                  This plan includes {pendingPlan.memberLimit} members. How many additional members do you want to add?
                </Text>
                <Text style={styles.modalRate}>
                  ₹{Math.round(pendingPlan.additionalMemberPrice ?? 0).toLocaleString('en-IN')} per additional member
                </Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={additionalCount}
                  onChangeText={setAdditionalCount}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnGhost} onPress={closeModal}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={confirmAdditionalAndRegister}>
                <Text style={styles.modalBtnPrimaryText}>Continue to register</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: colors.textOnDarkMuted, fontSize: 15, fontWeight: '600' },
  headerKicker: {
    color: colors.gold500,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: colors.textOnDarkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  cardGrid: {
    gap: 14,
  },
  loader: { marginTop: 40 },
  messageBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  mutedText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
  planPressed: { opacity: 0.92, borderColor: colors.navy800 },
  planName: { fontSize: 18, fontWeight: '800', color: colors.heading },
  planPrice: { fontSize: 26, fontWeight: '800', color: colors.navy800, marginTop: 8 },
  planMeta: { fontSize: 13, color: colors.muted, marginTop: 6 },
  planExtra: { fontSize: 13, color: colors.gold600, marginTop: 4, fontWeight: '600' },
  planDesc: { fontSize: 13, color: colors.label, marginTop: 10, lineHeight: 18 },
  planCta: { fontSize: 14, fontWeight: '700', color: colors.gold600, marginTop: 14 },
  primaryBtn: {
    backgroundColor: colors.navy800,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontWeight: '700' },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  retryText: { color: colors.navy800, fontWeight: '700' },
  secondaryLink: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  secondaryLinkText: { color: colors.navy800, fontWeight: '600', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.heading },
  modalPlan: { fontSize: 16, fontWeight: '700', color: colors.navy800, marginTop: 8 },
  modalSub: { fontSize: 14, color: colors.label, lineHeight: 20, marginTop: 8 },
  modalRate: { fontSize: 13, color: colors.gold600, fontWeight: '600', marginTop: 6 },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  modalBtnGhostText: { fontWeight: '700', color: colors.label },
  modalBtnPrimary: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.navy800,
    alignItems: 'center',
  },
  modalBtnPrimaryText: { fontWeight: '700', color: colors.white, fontSize: 13 },
});
