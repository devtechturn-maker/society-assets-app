import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchOnlinePaymentsStatus, refreshOnlinePayments, setupOnlinePayments } from '../../services/api';
import type { OnlinePaymentsStatus } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MOBILE = /^[6-9][0-9]{9}$/;

/**
 * Settings → Online payments. The chairman registers the society's saved bank account with Cashfree; members can
 * then pay maintenance online and the money settles straight to the society's own account. The rest of the office
 * sees the status only.
 */
export function OnlinePaymentsCard({ reloadKey }: { reloadKey?: unknown }) {
  const { theme } = useTheme();
  const { alert, confirm } = useAppAlert();
  const [data, setData] = useState<OnlinePaymentsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pan, setPan] = useState('');
  const [phone, setPhone] = useState('');

  async function load() {
    try {
      setError(null);
      const s = await fetchOnlinePaymentsStatus();
      setData(s);
      setPan((p) => p || s.societyPan || '');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  useEffect(() => {
    void load();
  }, [reloadKey]);

  async function submit() {
    const cleanPan = pan.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!PAN.test(cleanPan)) {
      alert('Check the PAN', "Enter the society's 10-character PAN, e.g. AAATG1234C.", { variant: 'error' });
      return;
    }
    if (!MOBILE.test(cleanPhone)) {
      alert('Check the mobile number', 'Enter a 10-digit mobile number for the society contact.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const s = await setupOnlinePayments({ pan: cleanPan, phone: cleanPhone });
      setData(s);
      setEditing(false);
      alert(
        s.onlinePaymentsOn ? 'Online payments are on' : 'Sent for verification',
        s.onlinePaymentsOn
          ? 'Members can now pay maintenance online. The money goes straight to the society bank account.'
          : 'Cashfree is verifying the society bank account. Tap "Check status" in a little while.',
        { variant: 'success' }
      );
    } catch (e) {
      alert('Could not turn on online payments', apiErrorMessage(e), { variant: 'error' });
      void load();
    } finally {
      setBusy(false);
    }
  }

  function askSubmit() {
    confirm({
      title: 'Turn on online payments?',
      message:
        `Members' online payments will settle to the society bank account ending ${data?.accountLast4 || '(saved under Bank details)'}. ` +
        'The society bank account and PAN are shared with Cashfree to verify it.',
      confirmText: 'Turn on',
      cancelText: 'Cancel',
      onConfirm: () => void submit(),
    });
  }

  async function checkStatus() {
    setBusy(true);
    try {
      setData(await refreshOnlinePayments());
    } catch (e) {
      alert('Could not check status', apiErrorMessage(e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <Text style={[styles.hint, { color: '#b91c1c' }]}>{error}</Text>;
  }
  if (!data) {
    return <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />;
  }

  const badge = data.onlinePaymentsOn
    ? { label: 'On', color: '#166534', bg: '#ecfdf5', icon: 'checkmark-circle' as const }
    : data.status === 'PENDING'
      ? { label: 'Verifying', color: '#92400e', bg: '#fffbeb', icon: 'time-outline' as const }
      : data.status === 'FAILED'
        ? { label: 'Not accepted', color: '#b91c1c', bg: '#fef2f2', icon: 'alert-circle-outline' as const }
        : { label: 'Off', color: '#64748b', bg: '#f1f5f9', icon: 'remove-circle-outline' as const };

  const showForm = data.canEdit && (editing || data.status === 'NOT_SET_UP' || data.status === 'FAILED' || !!data.bankChangedSinceSetup);

  return (
    <View style={[styles.box, { borderColor: theme.cardBorder }]}>
      <View style={styles.head}>
        <Ionicons name="card-outline" size={18} color={theme.text} />
        <Text style={[styles.title, { color: theme.text }]}>Online payments</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.color }]}>
          <Ionicons name={badge.icon} size={12} color={badge.color} />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Members pay maintenance in the app by UPI, card or net banking. Each payment goes straight to the society bank
        account (through Cashfree) and is recorded with a receipt automatically, with no screenshot to verify.
      </Text>

      {!data.gatewayAvailable ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>Online payments are not available yet. Please check back soon.</Text>
      ) : null}

      {data.status !== 'NOT_SET_UP' && data.accountLast4 ? (
        <Text style={[styles.meta, { color: theme.text }]}>
          Settles to account ending {data.accountLast4}
          {data.ifsc ? ` · ${data.ifsc}` : ''}
        </Text>
      ) : null}
      {data.bankChangedSinceSetup ? (
        <Text style={[styles.warn]}>
          The society bank details changed after online payments were set up, so online payment is paused. Confirm again
          below to resume.
        </Text>
      ) : null}
      {data.status === 'FAILED' && data.lastError ? <Text style={styles.warn}>{data.lastError}</Text> : null}

      {data.gatewayAvailable && !data.bankDetailsSaved && data.canEdit ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>Save the society bank details above first.</Text>
      ) : null}

      {data.gatewayAvailable && data.bankDetailsSaved && showForm ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <View>
            <Text style={[styles.label, { color: theme.text }]}>Society PAN</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.cardBorder, color: theme.text }]}
              value={pan}
              onChangeText={(v) => setPan(v.toUpperCase())}
              placeholder="AAATG1234C"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>
          <View>
            <Text style={[styles.label, { color: theme.text }]}>Contact mobile number</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.cardBorder, color: theme.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile"
              placeholderTextColor={theme.placeholder}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>
          <Pressable
            disabled={busy}
            onPress={askSubmit}
            style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{data.status === 'NOT_SET_UP' ? 'Turn on online payments' : 'Confirm bank account again'}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {data.status === 'PENDING' || (data.status === 'ACTIVE' && !showForm) ? (
        <View style={styles.row}>
          <Pressable disabled={busy} onPress={() => void checkStatus()} style={styles.link}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>{busy ? 'Checking…' : 'Check status'}</Text>
          </Pressable>
          {data.canEdit && data.status === 'ACTIVE' && !showForm ? (
            <Pressable disabled={busy} onPress={() => setEditing(true)} style={styles.link}>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>Update details</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!data.canEdit && data.status === 'NOT_SET_UP' ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>Only the chairman can turn on online payments.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 13, fontWeight: '700' },
  warn: { fontSize: 13, lineHeight: 18, color: '#b45309', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  row: { flexDirection: 'row', gap: 18 },
  link: { paddingVertical: 6 },
});
