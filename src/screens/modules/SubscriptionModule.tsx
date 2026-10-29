import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppAlert } from '../../context/AppAlertContext';
import { cancelSubscriptionAutoRenew, fetchSubscriptionStatus } from '../../services/api';
import { apiErrorMessage } from '../../utils/apiError';
import { getUser } from '../../services/storage';
import type { SocietySubscriptionStatus } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';

function day(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const LIFECYCLE: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  TRIAL: { label: 'Free trial', tone: 'ok' },
  ACTIVE: { label: 'Active', tone: 'ok' },
  EXPIRING: { label: 'Ending soon', tone: 'warn' },
  GRACE_PERIOD: { label: 'Grace period', tone: 'warn' },
  EXPIRED: { label: 'Expired', tone: 'bad' },
  PENDING: { label: 'Payment pending', tone: 'warn' },
};

export function SubscriptionModule() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<SocietySubscriptionStatus | null>(null);
  const [canPurchase, setCanPurchase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancellingAutoRenew, setCancellingAutoRenew] = useState(false);
  const { alert, confirm } = useAppAlert();

  function turnOffAutoRenew() {
    confirm({
      title: 'Turn off auto-renew?',
      message: `Your plan stays active until ${day(status?.validUntil)}. After that you will need to renew it yourself.`,
      confirmText: 'Turn off',
      cancelText: 'Keep on',
      destructive: true,
      onConfirm: async () => {
        setCancellingAutoRenew(true);
        try {
          setStatus(await cancelSubscriptionAutoRenew());
          alert('Auto-renew turned off', undefined, { variant: 'success' });
        } catch (e: unknown) {
          alert('Could not turn off auto-renew', apiErrorMessage(e), { variant: 'error' });
        } finally {
          setCancellingAutoRenew(false);
        }
      },
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, user] = await Promise.all([fetchSubscriptionStatus(), getUser()]);
      setStatus(s);
      setCanPurchase(['CHAIRMAN', 'TREASURER'].includes(String(user?.role ?? '').toUpperCase()));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  if (!status) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>Could not load your subscription. Pull to try again later.</Text>;
  }

  const lifecycle = LIFECYCLE[String(status.lifecycleStatus ?? status.status ?? '').toUpperCase()] ?? {
    label: status.status ?? '—',
    tone: 'ok' as const,
  };
  const toneColor = lifecycle.tone === 'ok' ? '#047857' : lifecycle.tone === 'warn' ? '#b45309' : '#b91c1c';
  const purchase = status.lastPurchase;
  const onTrial = String(status.lifecycleStatus ?? status.status).toUpperCase() === 'TRIAL';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Current plan</Text>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.headRow}>
          <Text style={[styles.planName, { color: theme.text }]}>
            {onTrial ? 'Free trial' : status.planName ?? (status.billingMonths ? `${status.billingMonths} Months` : 'No plan')}
          </Text>
          <Text style={[styles.badge, { color: toneColor, borderColor: toneColor }]}>{lifecycle.label}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{onTrial ? 'Trial ends' : 'Plan ends'}</Text>
          <Text style={[styles.value, { color: theme.text }]}>{day(status.validUntil)}</Text>
        </View>
        {!onTrial && (status.graceDays ?? 0) > 0 ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Access continues until (grace)</Text>
            <Text style={[styles.value, { color: theme.text }]}>{day(status.graceEndsAt)}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Flats in your society</Text>
          <Text style={[styles.value, { color: theme.text }]}>{status.flatCount ?? 0}</Text>
        </View>
        {status.autoRenew ? (
          <View style={[styles.autoRenew, status.autoRenewStatus === 'PENDING' ? styles.autoRenewWarn : null]}>
            <Text style={[styles.autoRenewTitle, status.autoRenewStatus === 'PENDING' ? styles.warnText : null]}>
              Auto-renew is on
            </Text>
            <Text style={[styles.autoRenewText, status.autoRenewStatus === 'PENDING' ? styles.warnText : null]}>
              {status.autoRenewStatus === 'PENDING'
                ? 'The last automatic renewal did not go through. It will be retried automatically.'
                : `Renews automatically on ${day(status.nextChargeAt)}. You get a reminder before every renewal.`}
            </Text>
            {canPurchase ? (
              <Pressable onPress={turnOffAutoRenew} disabled={cancellingAutoRenew} hitSlop={8}>
                <Text style={[styles.autoRenewAction, status.autoRenewStatus === 'PENDING' ? styles.warnText : null]}>
                  {cancellingAutoRenew ? 'Turning off…' : 'Turn off auto-renew'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : status.autoRenewStatus === 'HALTED' || status.autoRenewStatus === 'CANCELLED' ? (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Auto-renew is off.
          </Text>
        ) : null}
      </View>

      {purchase ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current period</Text>
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            {[
              ['Plan', `${purchase.months} months`],
              ['Period', `${day(purchase.periodStart)} – ${day(purchase.periodEnd)}`],
              ['Flats', String(purchase.flatCount)],
            ].map(([label, value]) => (
              <View style={styles.row} key={label}>
                <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
                <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { padding: 24, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6, marginBottom: 12 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  planName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  badge: { fontSize: 12, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  meta: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 13, flexShrink: 1 },
  value: { fontSize: 13, fontWeight: '700' },
  autoRenew: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    gap: 4,
  },
  autoRenewWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  autoRenewTitle: { fontSize: 14, fontWeight: '800', color: '#065f46' },
  autoRenewText: { fontSize: 13, lineHeight: 18, color: '#065f46' },
  autoRenewAction: { fontSize: 13, fontWeight: '800', color: '#065f46', textDecorationLine: 'underline', marginTop: 4 },
  warnText: { color: '#92400e' },
});
