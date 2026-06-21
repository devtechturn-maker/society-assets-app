import { useCallback, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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

      <View style={[styles.noteCard, { backgroundColor: theme.cardBg, borderColor: theme.divider }]}>

        <Text style={[styles.noteText, { color: theme.textMuted }]}>

          {due.alreadyPaidMessage || 'Maintenance is up to date for this period.'}

        </Text>

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

      <View style={[styles.summaryCard, { backgroundColor: theme.cardBg, borderColor: theme.divider }]}>

        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Amount due</Text>

        <Text style={[styles.summaryAmount, { color: theme.text }]}>{formatInr(due.payableAmount)}</Text>

        {due.description ? (

          <Text style={[styles.summaryDesc, { color: theme.textMuted }]}>{due.description}</Text>

        ) : null}

        <Text style={[styles.gatewayHint, { color: theme.textMuted }]}>

          {due.paymentUnavailableMessage ||

            'Online payments are not available for your society yet. Contact your chairman.'}

        </Text>

      </View>

    );

  }



  return (

    <>

      <View style={compact ? undefined : styles.block}>

        {!compact ? (

          <View style={[styles.summaryCard, { backgroundColor: theme.cardBg, borderColor: theme.divider }]}>

            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Amount due</Text>

            <Text style={[styles.summaryAmount, { color: theme.text }]}>{formatInr(due?.payableAmount)}</Text>

            {due?.description ? (

              <Text style={[styles.summaryDesc, { color: theme.textMuted }]}>{due.description}</Text>

            ) : null}

          </View>

        ) : null}

        <Pressable

          accessibilityRole="button"

          disabled={paying || !canPay}

          onPress={startPayment}

          style={[

            styles.payBtn,

            compact ? styles.payBtnCompact : null,

            { backgroundColor: theme.accent, opacity: paying || !canPay ? 0.7 : 1 },

          ]}

        >

          {paying ? (

            <ActivityIndicator size="small" color="#fff" />

          ) : (

            <Text style={styles.payBtnText}>

              {compact ? `Pay ${formatInr(due?.payableAmount)}` : 'Pay online now'}

            </Text>

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

  block: { gap: 12 },

  summaryCard: {

    borderWidth: 1,

    borderRadius: 12,

    padding: 14,

    gap: 4,

  },

  summaryLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  summaryAmount: { fontSize: 28, fontWeight: '800' },

  summaryDesc: { fontSize: 14, lineHeight: 20 },

  gatewayHint: { fontSize: 12, marginTop: 6, lineHeight: 18 },

  payBtn: {

    minHeight: 48,

    borderRadius: 10,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 16,

  },

  payBtnCompact: { alignSelf: 'flex-start', minWidth: 160 },

  payBtnText: {

    color: '#fff',

    fontSize: 14,

    fontWeight: '800',

    textTransform: 'uppercase',

    letterSpacing: 0.5,

  },

  noteCard: {

    borderWidth: 1,

    borderRadius: 10,

    padding: 12,

  },

  noteText: { fontSize: 13, lineHeight: 18 },

});


