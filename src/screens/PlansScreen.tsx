import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { WEB_PORTAL_URL } from '../config/env';
import { fetchPublicPlans } from '../services/api';
import type { PublicSubscriptionPlan } from '../types/api';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme/colors';

type Props = {
  onBack: () => void;
};

function formatPrice(plan: PublicSubscriptionPlan): string {
  const cycle = plan.billingCycle === 'MONTHLY' ? '/ month' : '/ year';
  return `₹${Math.round(plan.price).toLocaleString('en-IN')}${cycle}`;
}

function memberLabel(plan: PublicSubscriptionPlan): string {
  return plan.memberLimit < 0 ? 'Unlimited members' : `Up to ${plan.memberLimit} members`;
}

export function PlansScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function openRegister(planId: string) {
    const base = WEB_PORTAL_URL.replace(/\/$/, '');
    Linking.openURL(`${base}/register?planId=${encodeURIComponent(planId)}`).catch(() => undefined);
  }

  function openLanding() {
    Linking.openURL(WEB_PORTAL_URL).catch(() => undefined);
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
          Pick a plan below to register your society on the web portal, then return here to sign in.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : error ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => {
              setLoading(true);
              setError(null);
              fetchPublicPlans()
                .then(setPlans)
                .catch(() => setError('Could not load plans.'))
                .finally(() => setLoading(false));
            }}>
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
          plans.map((plan) => (
            <Pressable
              key={plan.id}
              style={({ pressed }) => [styles.planCard, pressed && styles.planPressed]}
              onPress={() => openRegister(plan.id)}
            >
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{formatPrice(plan)}</Text>
              <Text style={styles.planMeta}>{memberLabel(plan)}</Text>
              {plan.description ? (
                <Text style={styles.planDesc} numberOfLines={2}>
                  {plan.description}
                </Text>
              ) : null}
              <Text style={styles.planCta}>Register with this plan →</Text>
            </Pressable>
          ))
        )}

        <Pressable style={styles.secondaryLink} onPress={openLanding}>
          <Text style={styles.secondaryLinkText}>Browse full website</Text>
        </Pressable>
      </ScrollView>
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
    gap: 12,
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
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  planPressed: { opacity: 0.92 },
  planName: { fontSize: 18, fontWeight: '800', color: colors.heading },
  planPrice: { fontSize: 22, fontWeight: '800', color: colors.navy800, marginTop: 6 },
  planMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  planDesc: { fontSize: 13, color: colors.label, marginTop: 8, lineHeight: 18 },
  planCta: { fontSize: 14, fontWeight: '700', color: colors.gold600, marginTop: 12 },
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
  secondaryLink: { alignItems: 'center', marginTop: 8, paddingVertical: 12 },
  secondaryLinkText: { color: colors.navy800, fontWeight: '600', fontSize: 14 },
});
