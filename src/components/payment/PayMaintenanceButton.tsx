import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import {
  createMemberMaintenanceCheckout,
  verifyMemberMaintenancePayment,
} from '../../services/api';
import type { MemberMaintenanceCheckout, MemberMaintenanceDue } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { RazorpayCheckoutModal, type RazorpaySuccessPayload } from './RazorpayCheckoutModal';

type Props = {
  due?: MemberMaintenanceDue | null;
  compact?: boolean;
  onPaid?: () => void;
};

function formatInr(value: number | undefined): string {
  const amount = value ?? 0;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function PayMaintenanceButton({ due, compact = false, onPaid }: Props) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [paying, setPaying] = useState(false);
  const [checkout, setCheckout] = useState<MemberMaintenanceCheckout | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const canPay = due?.canPayOnline === true;
  const hasAmountDue = (due?.payableAmount ?? 0) > 0 && !due?.alreadyPaid;

  const startPayment = useCallback(async () => {
    if (!canPay) {
      alert(
        'Online payment unavailable',
        due?.paymentUnavailableMessage || 'Your society has not completed online payment setup yet.',
        { variant: 'info' }
      );
      return;
    }

    setPaying(true);
    try {
      const session = await createMemberMaintenanceCheckout();
      if (!session.orderId || !session.keyId) {
        throw new Error('Payment gateway is not ready. Please try again later.');
      }
      setCheckout(session);
      setCheckoutVisible(true);
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && e.response?.data?.message
          ? String(e.response.data.message)
          : e instanceof Error
            ? e.message
            : 'Unable to start payment.';
      alert('Payment unavailable', msg, { variant: 'error' });
    } finally {
      setPaying(false);
    }
  }, [alert, canPay, due?.paymentUnavailableMessage]);

  const handleSuccess = useCallback(
    async (payload: RazorpaySuccessPayload) => {
      if (!checkout) return;
      setCheckoutVisible(false);
      setPaying(true);
      try {
        await verifyMemberMaintenancePayment({
          paymentId: checkout.paymentId,
          razorpayOrderId: payload.razorpay_order_id,
          razorpayPaymentId: payload.razorpay_payment_id,
          razorpaySignature: payload.razorpay_signature,
        });
        alert('Payment successful', 'Your maintenance payment has been recorded.', { variant: 'success' });
        setCheckout(null);
        onPaid?.();
      } catch (e) {
        const msg =
          axios.isAxiosError(e) && e.response?.data?.message
            ? String(e.response.data.message)
            : e instanceof Error
              ? e.message
              : 'Payment verification failed.';
        alert('Verification failed', msg, { variant: 'error' });
      } finally {
        setPaying(false);
      }
    },
    [alert, checkout, onPaid]
  );

  if (!due) {
    return null;
  }

  if (due.alreadyPaid) {
    return compact ? null : (
      <View style={[styles.noteCard, styles.cardShadow, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
        <View style={styles.noteRow}>
          <View style={[styles.statusIcon, { backgroundColor: 'rgba(21, 128, 61, 0.12)' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#15803d" />
          </View>
          <Text style={[styles.noteText, { color: '#166534' }]}>
            {due.alreadyPaidMessage || 'Maintenance is up to date for this period.'}
          </Text>
        </View>
      </View>
    );
  }

  if (!hasAmountDue) {
    return null;
  }

  if (!canPay) {
    if (compact) {
      return null;
    }
    return (
      <View style={[styles.summaryCard, styles.cardShadow, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.summaryHead}>
          <View style={[styles.statusIcon, { backgroundColor: '#F3E8FB' }]}>
            <Ionicons name="business-outline" size={20} color={theme.accent} />
          </View>
          <View style={[styles.awaitingBadge, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
            <Text style={styles.awaitingBadgeText}>Awaiting Setup</Text>
          </View>
        </View>
        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Amount due</Text>
        <Text style={[styles.summaryAmount, { color: theme.text }]}>{formatInr(due.payableAmount)}</Text>
        {due.description ? (
          <Text style={[styles.summaryDesc, { color: theme.textMuted }]}>{due.description}</Text>
        ) : null}
        <View style={[styles.hintBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <Text style={[styles.gatewayHint, { color: '#92400E' }]}>
            {due.paymentUnavailableMessage ||
              'Online payments are not available for your society yet. Contact your chairman.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={compact ? undefined : styles.block}>
        {!compact ? (
          <View style={[styles.summaryCard, styles.cardShadow, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.summaryHead}>
              <View style={[styles.statusIcon, { backgroundColor: '#F3E8FB' }]}>
                <Ionicons name="wallet-outline" size={20} color={theme.accent} />
              </View>
              <View style={[styles.readyBadge, { backgroundColor: '#F3E8FB', borderColor: '#D8B4E8' }]}>
                <Text style={[styles.readyBadgeText, { color: theme.accent }]}>Ready to pay</Text>
              </View>
            </View>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Amount due</Text>
            <Text style={[styles.summaryAmount, { color: theme.accent }]}>{formatInr(due?.payableAmount)}</Text>
            {due?.description ? (
              <Text style={[styles.summaryDesc, { color: theme.textMuted }]}>{due.description}</Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={paying || !canPay}
          onPress={startPayment}
          style={({ pressed }) => [
            styles.payBtn,
            compact ? styles.payBtnCompact : null,
            {
              backgroundColor: theme.accent,
              opacity: paying || !canPay ? 0.7 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.payBtnInner}>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.payBtnText}>
                {compact ? `Pay ${formatInr(due?.payableAmount)}` : 'Pay online now'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <RazorpayCheckoutModal
        visible={checkoutVisible}
        checkout={checkout}
        onDismiss={() => {
          setCheckoutVisible(false);
          setCheckout(null);
        }}
        onFailed={(message) => {
          setCheckoutVisible(false);
          setCheckout(null);
          alert('Payment failed', message, { variant: 'error' });
        }}
        onSuccess={handleSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: 14 },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awaitingBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  awaitingBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  readyBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  summaryDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  hintBox: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  gatewayHint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  payBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  payBtnCompact: { alignSelf: 'flex-start', minWidth: 168 },
  payBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
