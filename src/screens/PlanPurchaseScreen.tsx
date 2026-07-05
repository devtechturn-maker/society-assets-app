import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppLogo } from '../components/AppLogo';
import { useAppAlert } from '../context/AppAlertContext';
import { createDurationPlanCheckout } from '../services/api';
import type { DurationPlanCard, SocietySubscriptionStatus } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import { colors } from '../theme/colors';

type Props = {
  status: SocietySubscriptionStatus;
  societyId: string | null;
  onActivated: (status: SocietySubscriptionStatus) => void;
  onLogout: () => void;
  onRefreshStatus: () => Promise<SocietySubscriptionStatus>;
};

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function PlanPurchaseScreen({
  status,
  societyId,
  onActivated,
  onLogout,
  onRefreshStatus,
}: Props) {
  const { alert } = useAppAlert();
  const [buyingMonths, setBuyingMonths] = useState<number | null>(null);

  const plans: DurationPlanCard[] = useMemo(() => {
    if (status.durationPlans?.length) {
      return status.durationPlans;
    }
    const pricePerFlat = status.pricePerFlat ?? 0;
    const flatCount = status.flatCount ?? 1;
    return [3, 6, 9, 12].map((months) => ({
      months,
      label: `${months} months`,
      pricePerFlat,
      flatCount,
      amount: pricePerFlat * flatCount * months,
      monthlyEquivalent: pricePerFlat * flatCount,
    }));
  }, [status]);

  const pricePerFlat = status.pricePerFlat ?? plans[0]?.pricePerFlat ?? 0;
  const flatCount = status.flatCount ?? plans[0]?.flatCount ?? 1;

  async function buyPlan(months: number) {
    if (buyingMonths != null) return;
    setBuyingMonths(months);
    try {
      const checkout = await createDurationPlanCheckout(months);
      const payment = checkout.payment;
      if (payment?.activated || payment?.required === false) {
        const next = await onRefreshStatus();
        onActivated(next);
        alert('Plan activated', `${months} month plan is now active.`, { variant: 'success' });
        return;
      }
      if (payment?.required && payment.orderId && payment.keyId && societyId) {
        // Razorpay web checkout is handled elsewhere; for now verify path needs client payment.
        // If gateway is configured but in-app checkout is not wired, surface a clear message.
        alert(
          'Complete payment',
          'Payment gateway is enabled. Use the checkout flow or contact support if payment does not open.',
          { variant: 'info' }
        );
        // Attempt verify is not possible without payment ids — leave pending.
        return;
      }
      const next = await onRefreshStatus();
      if (next.canAccessApp) {
        onActivated(next);
      }
    } catch (e: unknown) {
      alert('Could not start plan', apiErrorMessage(e), { variant: 'error' });
    } finally {
      setBuyingMonths(null);
    }
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppLogo variant="splash" size={72} style={styles.logo} />
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.message}>
          {status.message ??
            'Your trial has ended. Pricing is per flat — pick a duration to continue.'}
        </Text>

        <View style={styles.priceBanner}>
          <Text style={styles.priceLabel}>Price per flat</Text>
          <Text style={styles.priceValue}>{formatInr(pricePerFlat)} / month</Text>
          <Text style={styles.priceMeta}>
            {flatCount} flat{flatCount === 1 ? '' : 's'} in your society
          </Text>
        </View>

        <View style={styles.cards}>
          {plans.map((plan) => {
            const selectedBusy = buyingMonths === plan.months;
            return (
              <Pressable
                key={plan.months}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => void buyPlan(plan.months)}
                disabled={buyingMonths != null}
              >
                <Text style={styles.cardMonths}>{plan.label}</Text>
                <Text style={styles.cardAmount}>{formatInr(plan.amount)}</Text>
                <Text style={styles.cardMeta}>
                  {formatInr(plan.monthlyEquivalent)} / month total
                </Text>
                <Text style={styles.cardFormula}>
                  {formatInr(plan.pricePerFlat)} × {plan.flatCount} flats × {plan.months} mo
                </Text>
                <View style={styles.cardBtn}>
                  {selectedBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.cardBtnText}>Buy plan</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.logout} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  logo: { alignSelf: 'center', marginBottom: 4 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy900,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  priceBanner: {
    backgroundColor: '#70088c',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  priceValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  priceMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  cards: { gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardPressed: {
    borderColor: '#70088c',
    backgroundColor: '#faf5ff',
  },
  cardMonths: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy900,
  },
  cardAmount: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '800',
    color: '#70088c',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  cardFormula: {
    marginTop: 6,
    fontSize: 11,
    color: colors.muted,
  },
  cardBtn: {
    marginTop: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#70088c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  logout: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '700',
  },
});
