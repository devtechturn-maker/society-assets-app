import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppAlert } from '../../context/AppAlertContext';
import { createDurationPlanCheckout, verifySubscriptionPayment } from '../../services/api';
import type { DurationPlanCard, MemberMaintenanceCheckout } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import { RazorpayCheckoutModal, type RazorpaySuccessPayload } from '../payment/RazorpayCheckoutModal';

type Props = {
  /** Plans priced by the server for this society (status.durationPlans). */
  plans: DurationPlanCard[];
  flatCount: number;
  /** Only the chairman or treasurer can buy; others are told to ask them. */
  canPurchase: boolean;
  buyLabel?: string;
  onActivated: () => void;
};

function inr(value: number | undefined): string {
  const amount = value ?? 0;
  // Whole rupees without decimals; otherwise always two (₹31.50, not ₹31.5).
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

function day(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Lets the society pick a 3/6/9/12 month plan, shows the server's price breakdown and takes payment. */
export function PlanPicker({ plans, flatCount, canPurchase, buyLabel = 'Buy plan', onActivated }: Props) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [selectedId, setSelectedId] = useState<string | null>(plans[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<MemberMaintenanceCheckout | null>(null);
  const [checkoutSocietyId, setCheckoutSocietyId] = useState<string | null>(null);

  const plan = useMemo(() => plans.find((p) => p.id === selectedId) ?? plans[0], [plans, selectedId]);

  async function buy() {
    if (!plan || busy) return;
    if (flatCount <= 0) {
      alert('Add your flats first', "Set your society's flats before choosing a plan.", { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const result = await createDurationPlanCheckout(plan.id);
      const payment = result.payment;
      if (payment?.activated || payment?.required === false) {
        alert('Plan activated', `${plan.name} plan is active until ${day(result.period?.endsAt)}.`, { variant: 'success' });
        onActivated();
        return;
      }
      if (!payment?.orderId || !payment.keyId) {
        alert('Could not start payment', 'Payment details are missing. Please try again.', { variant: 'error' });
        return;
      }
      setCheckoutSocietyId(result.societyId);
      setCheckout({
        required: true,
        paymentId: '',
        amountInr: payment.amountInr ?? result.amount,
        description: `${plan.name} subscription (${result.flatCount} flats, incl. GST)`,
        maintenanceFromMonth: '',
        maintenanceToMonth: '',
        keyId: payment.keyId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        societyName: 'Society Assets',
      } as MemberMaintenanceCheckout);
    } catch (e: unknown) {
      alert('Could not start plan', apiErrorMessage(e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function onPaid(payload: RazorpaySuccessPayload) {
    setCheckout(null);
    if (!checkoutSocietyId) return;
    setBusy(true);
    try {
      const result = await verifySubscriptionPayment({
        societyId: checkoutSocietyId,
        razorpayOrderId: payload.razorpay_order_id,
        razorpayPaymentId: payload.razorpay_payment_id,
        razorpaySignature: payload.razorpay_signature,
      });
      alert('Payment successful', `Your plan is active until ${day(result.validUntil)}.`, { variant: 'success' });
      onActivated();
    } catch (e: unknown) {
      alert('Payment not confirmed', apiErrorMessage(e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (!plans.length || !plan) {
    return (
      <Text style={[styles.empty, { color: theme.textMuted }]}>No plans are available right now. Please try again later.</Text>
    );
  }

  const row = (label: string, value: string, strong = false) => (
    <View style={styles.row} key={label}>
      <Text style={[strong ? styles.rowStrong : styles.rowLabel, { color: strong ? theme.text : theme.textMuted }]}>{label}</Text>
      <Text style={[strong ? styles.rowStrong : styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <View>
      <View style={styles.chips}>
        {plans.map((p) => {
          const active = p.id === plan.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelectedId(p.id)}
              style={[
                styles.chip,
                { borderColor: active ? theme.accent : theme.cardBorder, backgroundColor: active ? theme.accent : theme.cardBg },
              ]}
            >
              <Text style={[styles.chipTitle, { color: active ? '#fff' : theme.text }]}>{p.months} months</Text>
              <Text style={[styles.chipPrice, { color: active ? '#fff' : theme.textMuted }]}>{inr(p.total)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{plan.name} plan</Text>
        {row('Allowed flats', String(plan.includedFlats))}
        {row("Your society's flats", String(plan.flatCount))}
        {row('Extra flats', String(plan.extraFlats))}
        {row('Price per flat', inr(plan.pricePerFlat))}
        {row('Extra flat price', inr(plan.extraFlatPrice))}
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        {row(`Base (${plan.flatCount - plan.extraFlats} × ${inr(plan.pricePerFlat)})`, inr(plan.baseAmount))}
        {row(`Extra flats (${plan.extraFlats} × ${inr(plan.extraFlatPrice)})`, inr(plan.extraFlatAmount))}
        {row('Subtotal', inr(plan.subtotal))}
        {row(`GST (${plan.gstPercent}%)`, inr(plan.gstAmount))}
        {row('Total payable', inr(plan.total), true)}
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        {row('Starts', day(plan.startsAt))}
        {row('Ends', day(plan.endsAt))}
        {row('Grace period after end', `${plan.graceDays} days`)}
        {row('Free trial for new societies', `${plan.trialDays} days`)}
      </View>

      {canPurchase ? (
        <Pressable
          style={({ pressed }) => [styles.buy, { backgroundColor: theme.accent }, (pressed || busy) && styles.buyPressed]}
          onPress={() => void buy()}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyText}>{buyLabel} · {inr(plan.total)}</Text>}
        </Pressable>
      ) : (
        <Text style={[styles.note, { color: theme.textMuted }]}>
          Ask your society chairman or treasurer to choose a plan.
        </Text>
      )}

      <RazorpayCheckoutModal
        visible={checkout != null}
        checkout={checkout}
        title="Pay subscription"
        onDismiss={() => setCheckout(null)}
        onFailed={(message) => {
          setCheckout(null);
          alert('Payment failed', message, { variant: 'error' });
        }}
        onSuccess={(payload) => void onPaid(payload)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexGrow: 1, flexBasis: '22%', minWidth: 72, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  chipTitle: { fontSize: 14, fontWeight: '800' },
  chipPrice: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 13, flexShrink: 1 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  rowStrong: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, marginVertical: 4 },
  buy: { marginTop: 14, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buyPressed: { opacity: 0.85 },
  buyText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note: { marginTop: 14, fontSize: 13, textAlign: 'center' },
  empty: { fontSize: 14, textAlign: 'center', marginVertical: 16 },
});
