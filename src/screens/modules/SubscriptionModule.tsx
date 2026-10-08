import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlanPicker } from '../../components/subscription/PlanPicker';
import { fetchSubscriptionStatus } from '../../services/api';
import { getUser } from '../../services/storage';
import type { SocietySubscriptionStatus } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';

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
        {status.message ? <Text style={[styles.meta, { color: theme.textMuted }]}>{status.message}</Text> : null}
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
      </View>

      {purchase ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Last payment</Text>
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            {[
              ['Plan', `${purchase.months} months`],
              ['Period', `${day(purchase.periodStart)} – ${day(purchase.periodEnd)}`],
              ['Flats billed', `${purchase.flatCount} (${purchase.includedFlats} included, ${purchase.extraFlats} extra)`],
              ['Base amount', inr(purchase.baseAmount)],
              ['Extra flats', inr(purchase.extraFlatAmount)],
              ['Subtotal', inr(purchase.subtotal)],
              [`GST (${purchase.gstPercent}%)`, inr(purchase.gstAmount)],
              ['Total paid', inr(purchase.total)],
            ].map(([label, value]) => (
              <View style={styles.row} key={label}>
                <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
                <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>{onTrial ? 'Choose a plan' : 'Renew or change plan'}</Text>
      <Text style={[styles.meta, { color: theme.textMuted, marginBottom: 10 }]}>
        A new plan starts when your current period ends, so you never lose paid days.
      </Text>
      <PlanPicker
        plans={status.durationPlans ?? []}
        flatCount={status.flatCount ?? 0}
        canPurchase={canPurchase}
        buyLabel={onTrial ? 'Buy plan' : 'Renew'}
        onActivated={() => void load()}
      />
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
});
