import { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';
import type { MemberMaintenanceCheckout } from '../../types/api';

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type Props = {
  visible: boolean;
  checkout: MemberMaintenanceCheckout | null;
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onDismiss: () => void;
  onFailed: (message: string) => void;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCheckoutHtml(checkout: MemberMaintenanceCheckout): string {
  const keyId = escapeHtml(checkout.keyId ?? '');
  const orderId = escapeHtml(checkout.orderId ?? '');
  const amount = checkout.amount ?? Math.round((checkout.amountInr ?? 0) * 100);
  const name = escapeHtml(checkout.societyName ?? 'Society maintenance');
  const description = escapeHtml(checkout.description ?? 'Maintenance payment');
  const prefillName = escapeHtml(checkout.prefill?.name ?? '');
  const prefillEmail = escapeHtml(checkout.prefill?.email ?? '');
  const prefillContact = escapeHtml(checkout.prefill?.contact ?? '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Pay maintenance</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #64748b; line-height: 1.5; }
    .loading { text-align: center; padding: 32px 0; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${name}</h1>
    <p>${description}</p>
    <div class="loading" id="status">Opening secure payment…</div>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
      }
    }
    try {
      var options = {
        key: "${keyId}",
        order_id: "${orderId}",
        amount: ${amount},
        currency: "INR",
        name: "${name}",
        description: "${description}",
        prefill: {
          name: "${prefillName}",
          email: "${prefillEmail}",
          contact: "${prefillContact}"
        },
        theme: { color: "#1e3a5f" },
        handler: function (response) {
          post("success", response);
        },
        modal: {
          ondismiss: function () { post("dismiss"); },
          escape: true,
          backdropclose: false,
          confirm_close: true
        }
      };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        var message = (response && response.error && response.error.description) || "Payment failed";
        post("failed", { message: message });
      });
      rzp.open();
    } catch (err) {
      post("failed", { message: err && err.message ? err.message : "Unable to start payment" });
    }
  </script>
</body>
</html>`;
}

export function RazorpayCheckoutModal({ visible, checkout, onSuccess, onDismiss, onFailed }: Props) {
  const { theme } = useTheme();
  const html = useMemo(() => (checkout ? buildCheckoutHtml(checkout) : ''), [checkout]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as {
        type: string;
        payload?: Record<string, string>;
      };
      if (parsed.type === 'success' && parsed.payload) {
        onSuccess({
          razorpay_payment_id: parsed.payload.razorpay_payment_id ?? '',
          razorpay_order_id: parsed.payload.razorpay_order_id ?? '',
          razorpay_signature: parsed.payload.razorpay_signature ?? '',
        });
        return;
      }
      if (parsed.type === 'failed') {
        onFailed(parsed.payload?.message ?? 'Payment failed');
        return;
      }
      if (parsed.type === 'dismiss') {
        onDismiss();
      }
    } catch {
      onFailed('Unexpected payment response');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.container, { backgroundColor: theme.pageBg }]}>
        <View style={[styles.header, { borderBottomColor: theme.divider, backgroundColor: theme.cardBg }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Pay maintenance</Text>
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: theme.accent }]}>Close</Text>
          </Pressable>
        </View>
        {checkout?.orderId ? (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            onMessage={handleMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.accent} />
              </View>
            )}
          />
        ) : (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 14, fontWeight: '600' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
