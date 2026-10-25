import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../../config/env';
import { getToken } from '../../services/storage';
import { AuthenticatedImage } from '../chat/AuthenticatedImage';
import { useAppAlert } from '../../context/AppAlertContext';
import { memberPaymentScreenshotPath, societyPaymentQrPath, submitMaintenancePayment } from '../../services/api';
import type {
  MaintenancePaymentMethod,
  MaintenancePaymentSubmission,
  MemberMaintenanceDue,
  SocietyBankDetails,
} from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import { pickPhotoFromCamera, pickPhotoFromLibrary, showPhotoSourcePicker, type PickedPhoto } from '../../utils/pickPhoto';

export function inr(value: number | undefined | null): string {
  const amount = value ?? 0;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function day(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthsLabel(from: string, to: string): string {
  const fmt = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };
  return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
}

const METHODS: { key: MaintenancePaymentMethod; label: string }[] = [
  { key: 'UPI', label: 'UPI' },
  { key: 'BANK_TRANSFER', label: 'Bank transfer' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'OTHER', label: 'Other' },
];

export function methodLabel(method?: string | null): string {
  return METHODS.find((m) => m.key === method)?.label ?? 'Bank transfer';
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_REVIEW: { label: 'Waiting for verification', color: '#92400e', bg: '#fffbeb' },
  APPROVED: { label: 'Approved', color: '#166534', bg: '#ecfdf5' },
  REJECTED: { label: 'Rejected', color: '#b91c1c', bg: '#fef2f2' },
  COMPLETED: { label: 'Paid online', color: '#166534', bg: '#ecfdf5' },
  PENDING: { label: 'Not completed', color: '#64748b', bg: '#f1f5f9' },
  FAILED: { label: 'Failed', color: '#64748b', bg: '#f1f5f9' },
  REFUND_REQUIRED: { label: 'Refund due', color: '#b91c1c', bg: '#fef2f2' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, color: '#64748b', bg: '#f1f5f9' };
  return <Text style={[styles.badge, { color: s.color, backgroundColor: s.bg, borderColor: s.color }]}>{s.label}</Text>;
}

/**
 * The society's payment QR (uploaded by the chairman): members scan it from another phone, share it to their UPI
 * app, or open their UPI app directly when the society has a UPI ID. Money goes straight to the society.
 */
export function SocietyQrCard({
  details,
  portal,
  amount,
  note,
}: {
  details: SocietyBankDetails;
  portal: 'member' | 'society';
  amount?: number;
  note?: string;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [sharing, setSharing] = useState(false);
  const path = societyPaymentQrPath(portal, details.qrUpdatedAt);

  async function shareQr() {
    setSharing(true);
    try {
      const token = await getToken();
      const target = `${FileSystem.cacheDirectory}society-payment-qr.jpg`;
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (result.status !== 200) throw new Error('Could not load the QR code');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'image/jpeg', dialogTitle: 'Society payment QR' });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not share the QR code', 'error');
    } finally {
      setSharing(false);
    }
  }

  async function openUpiApp() {
    const params = [
      `pa=${encodeURIComponent(details.upiId)}`,
      details.accountHolderName ? `pn=${encodeURIComponent(details.accountHolderName)}` : '',
      amount && amount > 0 ? `am=${amount.toFixed(2)}` : '',
      'cu=INR',
      note ? `tn=${encodeURIComponent(note)}` : '',
    ].filter(Boolean);
    try {
      await Linking.openURL(`upi://pay?${params.join('&')}`);
    } catch {
      toast('No UPI app found. Scan the QR code from another phone or pay to the bank account.', 'error');
    }
  }

  return (
    <View style={[styles.bankCard, { borderColor: theme.cardBorder, backgroundColor: theme.pageBg, alignItems: 'center' }]}>
      <View style={[styles.bankHead, { alignSelf: 'stretch' }]}>
        <Ionicons name="qr-code-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.bankTitle, { color: theme.text }]}>Scan to pay the society</Text>
      </View>
      {amount && amount > 0 ? (
        <Text style={[styles.qrAmount, { color: theme.text }]}>Amount to pay: {inr(amount)}</Text>
      ) : null}
      <View style={styles.qrFrame}>
        <AuthenticatedImage path={path} style={styles.qrImage} resizeMode="contain" />
      </View>
      {details.accountHolderName ? (
        <Text style={[styles.qrPayee, { color: theme.text }]}>Payee: {details.accountHolderName}</Text>
      ) : null}
      <Text style={[styles.copyHint, { color: theme.textMuted, textAlign: 'center' }]}>
        Scan with PhonePe, Google Pay, Paytm or any UPI app. Check the payee name before you pay.
      </Text>
      <View style={styles.qrActions}>
        {details.upiId ? (
          <Pressable onPress={() => void openUpiApp()} style={[styles.qrBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
            <Text style={styles.qrBtnTextLight}>Pay with UPI app</Text>
          </Pressable>
        ) : null}
        <Pressable disabled={sharing} onPress={() => void shareQr()} style={[styles.qrBtn, { borderColor: theme.accent, borderWidth: 1 }]}>
          {sharing ? <ActivityIndicator color={theme.accent} /> : <Ionicons name="share-outline" size={16} color={theme.accent} />}
          <Text style={{ color: theme.accent, fontWeight: '800' }}>Save / share QR</Text>
        </Pressable>
      </View>
      <Text style={[styles.copyHint, { color: theme.textMuted, textAlign: 'center' }]}>
        After paying, come back here and submit the screenshot with the UTR number.
      </Text>
    </View>
  );
}

/** The society's bank account, with each value selectable so members can copy it into their banking app. */
export function BankDetailsCard({ details }: { details: SocietyBankDetails }) {
  const { theme } = useTheme();
  const rows: [string, string][] = [
    ['Account holder', details.accountHolderName],
    ['Bank', details.bankBranch ? `${details.bankName}, ${details.bankBranch}` : details.bankName],
    ['Account number', details.accountNumber],
    ['IFSC', details.ifsc],
  ].filter(([, v]) => !!v) as [string, string][];
  if (details.upiId) rows.push(['UPI ID', details.upiId]);
  if (rows.length === 0 && !details.paymentInstructions) return null;
  return (
    <View style={[styles.bankCard, { borderColor: theme.cardBorder, backgroundColor: theme.pageBg }]}>
      <View style={styles.bankHead}>
        <Ionicons name="business-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.bankTitle, { color: theme.text }]}>Pay to this account</Text>
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.bankRow}>
          <Text style={[styles.bankLabel, { color: theme.textMuted }]}>{label}</Text>
          <Text selectable style={[styles.bankValue, { color: theme.text }]}>
            {value || '—'}
          </Text>
        </View>
      ))}
      {details.paymentInstructions ? (
        <Text style={[styles.instructions, { color: theme.textMuted }]}>{details.paymentInstructions}</Text>
      ) : null}
      <Text style={[styles.copyHint, { color: theme.textMuted }]}>Long-press a value to copy it.</Text>
    </View>
  );
}

/** Full-screen view of a payment screenshot (fetched with the user's login, never a public link). */
export function ScreenshotViewer({ path, onClose }: { path: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!path} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewer}>
        <Pressable style={styles.viewerClose} onPress={onClose} hitSlop={12} accessibilityLabel="Close screenshot">
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        {path ? <AuthenticatedImage path={path} style={styles.viewerImage} resizeMode="contain" /> : null}
      </View>
    </Modal>
  );
}

/** One submitted payment: months, amount, how it was paid, status and (if rejected) why. */
export function SubmissionRow({
  item,
  screenshotPath,
  showFlat = false,
  children,
}: {
  item: MaintenancePaymentSubmission;
  screenshotPath: string;
  showFlat?: boolean;
  children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [viewing, setViewing] = useState(false);
  return (
    <View style={[styles.row, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
      <View style={styles.rowTop}>
        {item.hasScreenshot ? (
          <Pressable onPress={() => setViewing(true)} accessibilityLabel="View payment screenshot">
            <AuthenticatedImage path={screenshotPath} style={styles.thumb} />
          </Pressable>
        ) : null}
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>
            {showFlat ? `${item.flatNumber} · ${item.memberName}` : monthsLabel(item.maintenanceFromMonth, item.maintenanceToMonth)}
          </Text>
          <Text style={[styles.rowAmount, { color: theme.text }]}>{inr(item.amount)}</Text>
          {showFlat ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>{monthsLabel(item.maintenanceFromMonth, item.maintenanceToMonth)}</Text>
          ) : null}
          {item.referenceNo ? (
            <Text style={[styles.meta, { color: theme.textMuted }]} selectable>
              {methodLabel(item.paymentMethod)} · Ref {item.referenceNo} · Paid {day(item.paidOn)}
            </Text>
          ) : null}
          {item.memberNote ? <Text style={[styles.meta, { color: theme.textMuted }]}>“{item.memberNote}”</Text> : null}
        </View>
      </View>
      <View style={styles.rowStatus}>
        <StatusBadge status={item.status} />
        {item.reviewedAt ? (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {item.reviewedByName ? `by ${item.reviewedByName}, ` : ''}
            {day(item.reviewedAt)}
          </Text>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Submitted {day(item.createdAt)}</Text>
        )}
      </View>
      {item.status === 'REJECTED' && item.rejectionReason ? (
        <Text style={styles.reason}>Reason: {item.rejectionReason}</Text>
      ) : null}
      {children}
      <ScreenshotViewer path={viewing ? screenshotPath : null} onClose={() => setViewing(false)} />
    </View>
  );
}

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "I have paid" form. The screenshot is required; the amount comes from the server. */
function SubmitPaymentSheet({
  due,
  visible,
  onClose,
  onSubmitted,
}: {
  due: MemberMaintenanceDue;
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [method, setMethod] = useState<MaintenancePaymentMethod>('UPI');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  const referenceError = reference.trim().length < 4 ? 'Enter the transaction / UTR reference number.' : '';
  const dateError = /^\d{4}-\d{2}-\d{2}$/.test(paidOn.trim()) ? '' : 'Use the format YYYY-MM-DD.';
  const photoError = photo ? '' : 'A screenshot of the payment is required.';

  function choosePhoto() {
    showPhotoSourcePicker(
      () => void pickPhotoFromCamera().then((p) => p && setPhoto(p)),
      () => void pickPhotoFromLibrary().then((p) => p && setPhoto(p))
    );
  }

  async function submit() {
    setTried(true);
    if (referenceError || dateError || photoError || !photo) return;
    setBusy(true);
    try {
      await submitMaintenancePayment({
        paymentMethod: method,
        referenceNo: reference.trim(),
        paidOn: paidOn.trim(),
        note: note.trim() || undefined,
        screenshot: photo,
      });
      alert(
        'Payment submitted',
        'The society office will check your screenshot and confirm the payment. You will get a notification.',
        { variant: 'success' }
      );
      setReference('');
      setNote('');
      setPhoto(null);
      setTried(false);
      onSubmitted();
    } catch (e) {
      alert('Could not submit', apiErrorMessage(e, 'Please try again.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.pageBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheetHead, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Submit maintenance payment</Text>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          <View style={[styles.dueBox, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
            <Text style={[styles.meta, { color: theme.textMuted }]}>{monthsLabel(due.maintenanceFromMonth, due.maintenanceToMonth)}</Text>
            <Text style={[styles.dueAmount, { color: theme.text }]}>{inr(due.payableAmount)}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>Transfer exactly this amount, then fill in the details below.</Text>
          </View>
          {due.bankDetails.hasQrCode ? (
            <SocietyQrCard
              details={due.bankDetails}
              portal="member"
              amount={due.payableAmount}
              note={`Maintenance ${monthsLabel(due.maintenanceFromMonth, due.maintenanceToMonth)}`}
            />
          ) : null}
          <BankDetailsCard details={due.bankDetails} />

          <Text style={[styles.label, { color: theme.text }]}>How did you pay?</Text>
          <View style={styles.chips}>
            {METHODS.map((m) => {
              const on = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  style={[styles.chip, { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accent : 'transparent' }]}
                >
                  <Text style={{ color: on ? '#fff' : theme.text, fontWeight: '700' }}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Transaction / UTR reference *</Text>
          <TextInput
            style={input}
            value={reference}
            onChangeText={setReference}
            placeholder="e.g. 431298765432"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="characters"
            maxLength={80}
          />
          {tried && referenceError ? <Text style={styles.error}>{referenceError}</Text> : null}

          <Text style={[styles.label, { color: theme.text }]}>Payment date *</Text>
          <TextInput style={input} value={paidOn} onChangeText={setPaidOn} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} maxLength={10} />
          {tried && dateError ? <Text style={styles.error}>{dateError}</Text> : null}

          <Text style={[styles.label, { color: theme.text }]}>Payment screenshot *</Text>
          {photo ? (
            <View style={[styles.previewBox, { borderColor: theme.cardBorder }]}>
              <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
              <View style={styles.previewActions}>
                <Text style={[styles.meta, { color: theme.textMuted, flex: 1 }]} numberOfLines={1}>
                  {photo.fileName}
                </Text>
                <Pressable onPress={choosePhoto}>
                  <Text style={[styles.link, { color: theme.accent }]}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={choosePhoto}
              style={[styles.upload, { borderColor: tried && photoError ? '#b91c1c' : theme.cardBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Add payment screenshot"
            >
              <Ionicons name="image-outline" size={26} color={theme.textMuted} />
              <Text style={[styles.uploadText, { color: theme.text }]}>Add screenshot</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>Photo or screenshot of the successful payment (JPG/PNG, up to 10 MB)</Text>
            </Pressable>
          )}
          {tried && photoError ? <Text style={styles.error}>{photoError}</Text> : null}

          <Text style={[styles.label, { color: theme.text }]}>Note (optional)</Text>
          <TextInput
            style={[input, { minHeight: 70, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="Anything the office should know"
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={500}
          />

          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            style={[styles.primary, { backgroundColor: theme.accent, opacity: busy ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit for verification</Text>}
          </Pressable>
          <Text style={[styles.meta, { color: theme.textMuted, textAlign: 'center', marginTop: 8 }]}>
            Your payment is counted only after the society office verifies it.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * What a flat owner sees for maintenance: amount due, where to pay, and the status of what they submitted.
 * {@code compact} is the short dashboard version.
 */
export function MaintenancePaymentPanel({
  due,
  compact = false,
  onSubmitted,
}: {
  due?: MemberMaintenanceDue | null;
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  if (!due) return null;

  const latest = due.submissions?.[0];
  const pending = due.submissions?.find((s) => s.status === 'PENDING_REVIEW');
  const rejected = !pending && latest?.status === 'REJECTED' ? latest : null;

  if (due.alreadyPaid && !pending) {
    return compact ? null : (
      <View style={[styles.note, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
        <Ionicons name="checkmark-circle" size={20} color="#15803d" />
        <Text style={[styles.noteText, { color: '#166534' }]}>{due.alreadyPaidMessage || 'Maintenance is up to date.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {pending ? (
        <View style={[styles.note, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="time-outline" size={20} color="#b45309" />
          <Text style={[styles.noteText, { color: '#92400e' }]}>
            Your payment of {inr(pending.amount)} (ref {pending.referenceNo}) is waiting for the society office to verify it.
          </Text>
        </View>
      ) : null}
      {rejected ? (
        <View style={[styles.note, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#b91c1c" />
          <Text style={[styles.noteText, { color: '#b91c1c' }]}>
            Your last payment was not accepted{rejected.rejectionReason ? `: ${rejected.rejectionReason}` : ''}. Please submit it again.
          </Text>
        </View>
      ) : null}

      {!pending && due.payableAmount > 0 ? (
        <>
          <View style={styles.dueLine}>
            <View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>{monthsLabel(due.maintenanceFromMonth, due.maintenanceToMonth)}</Text>
              <Text style={[styles.dueAmount, { color: theme.text }]}>{inr(due.payableAmount)}</Text>
            </View>
            {due.penaltyAmount > 0 ? (
              <Text style={[styles.meta, { color: '#b45309' }]}>incl. late fee {inr(due.penaltyAmount)}</Text>
            ) : null}
          </View>
          {!compact && due.bankDetails.hasQrCode && due.canSubmit ? (
            <SocietyQrCard details={due.bankDetails} portal="member" amount={due.payableAmount} note={`Maintenance ${monthsLabel(due.maintenanceFromMonth, due.maintenanceToMonth)}`} />
          ) : null}
          {!compact && due.bankDetails.configured ? <BankDetailsCard details={due.bankDetails} /> : null}
          {due.canSubmit ? (
            <Pressable
              onPress={() => setOpen(true)}
              style={[styles.primary, { backgroundColor: theme.accent, marginTop: 0 }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{compact ? 'Pay & upload screenshot' : 'I have paid — upload screenshot'}</Text>
            </Pressable>
          ) : due.submitUnavailableMessage ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>{due.submitUnavailableMessage}</Text>
          ) : null}
        </>
      ) : null}

      {due.canSubmit ? (
        <SubmitPaymentSheet
          due={due}
          visible={open}
          onClose={() => setOpen(false)}
          onSubmitted={() => {
            setOpen(false);
            onSubmitted?.();
          }}
        />
      ) : null}
    </View>
  );
}

/** The member's own submissions, newest first. */
export function MySubmissions({ items }: { items: MaintenancePaymentSubmission[] }) {
  const { theme } = useTheme();
  const shown = items.filter((s) => s.referenceNo || s.status === 'COMPLETED');
  if (!shown.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: theme.text, marginTop: 4 }]}>Submitted payments</Text>
      {shown.map((s) => (
        <SubmissionRow key={s.id} item={s} screenshotPath={memberPaymentScreenshotPath(s.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  qrAmount: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  qrFrame: { backgroundColor: '#fff', borderRadius: 12, padding: 8, marginVertical: 10 },
  qrImage: { width: 240, height: 240 },
  qrPayee: { fontSize: 14, fontWeight: '700' },
  qrActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 10 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  qrBtnTextLight: { color: '#fff', fontWeight: '800' },
  badge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  bankCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  bankHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  bankTitle: { fontSize: 14, fontWeight: '800' },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bankLabel: { fontSize: 13 },
  bankValue: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  instructions: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  copyHint: { fontSize: 11, marginTop: 2 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 48, right: 20, zIndex: 2 },
  viewerImage: { width: '100%', height: '80%' },
  row: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  rowTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e2e8f0' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  rowStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, lineHeight: 17 },
  reason: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  // Full-screen modal: on Android it is drawn under the status bar, so leave room for it.
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetBody: { padding: 16, paddingBottom: 48, gap: 6 },
  dueBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 2, marginBottom: 6 },
  dueAmount: { fontSize: 24, fontWeight: '900' },
  dueLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  error: { color: '#b91c1c', fontSize: 12, fontWeight: '600', marginTop: 4 },
  upload: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 18, alignItems: 'center', gap: 4 },
  uploadText: { fontSize: 15, fontWeight: '800' },
  previewBox: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  preview: { width: '100%', height: 220, backgroundColor: '#0f172a' },
  previewActions: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  link: { fontWeight: '800' },
  primary: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 14, padding: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
