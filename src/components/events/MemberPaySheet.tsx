import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitMemberEventPayment } from '../../services/api';
import type { EventPaymentMethod } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import { todayIsoDate } from '../../utils/dates';
import { compactInr } from '../../utils/eventFormat';
import { pickPhotoFromCamera, pickPhotoFromLibrary, showPhotoSourcePicker, type PickedPhoto } from '../../utils/pickPhoto';
import { ChipRow, EventSheet, SheetButtons, SheetField, SheetInput } from './EventSheet';

const METHODS: { label: string; value: EventPaymentMethod }[] = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Other', value: 'OTHER' },
];

/** Member tells the committee "I have paid" — it counts once the committee verifies it. */
export function MemberPaySheet({
  visible,
  eventId,
  eventName,
  remaining,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  eventId: string;
  eventName: string;
  remaining: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<EventPaymentMethod>('UPI');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<PickedPhoto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(remaining > 0 ? String(remaining) : '');
    setMethod('UPI');
    setReference('');
    setProof(null);
    setSaving(false);
  }, [visible, remaining]);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast('Enter the amount you paid.', 'warning');
      return;
    }
    if (!reference.trim()) {
      toast('Add the UPI / transaction reference so the committee can match it.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await submitMemberEventPayment(
        eventId,
        { amount: value, paymentMethod: method, referenceNo: reference.trim(), txnDate: todayIsoDate() },
        proof
      );
      toast('Sent to the committee for verification', 'success');
      onSubmitted();
      onClose();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not submit your payment'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventSheet
      visible={visible}
      title="I have paid"
      subtitle={`${eventName}${remaining > 0 ? ` · ${compactInr(remaining)} remaining` : ''}`}
      onClose={onClose}
      footer={<SheetButtons onCancel={onClose} onSave={() => void submit()} saving={saving} saveLabel="Submit" />}
    >
      <View style={[styles.info, { backgroundColor: theme.accentSoft }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
        <Text style={[styles.infoText, { color: theme.textSoft }]}>
          Paid online? Share the reference here. Cash payments are recorded directly by the committee.
        </Text>
      </View>

      <SheetField label="Amount paid">
        <SheetInput large value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="₹ 0" />
      </SheetField>

      <SheetField label="Paid via">
        <ChipRow options={METHODS} value={method} onChange={setMethod} />
      </SheetField>

      <SheetField label="UPI / transaction reference">
        <SheetInput value={reference} onChangeText={setReference} placeholder="e.g. 428917365012" autoCapitalize="characters" maxLength={80} />
      </SheetField>

      <SheetField label="Payment screenshot" hint="optional">
        {proof ? (
          <View style={styles.proof}>
            <Image source={{ uri: proof.uri }} style={styles.proofImg} />
            <Pressable onPress={() => setProof(null)} accessibilityRole="button">
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              showPhotoSourcePicker(
                () => void pickPhotoFromCamera().then((photo) => photo && setProof(photo)),
                () => void pickPhotoFromLibrary().then((photo) => photo && setProof(photo))
              )
            }
            style={[styles.addProof, { borderColor: theme.inputBorder }]}
            accessibilityRole="button"
          >
            <Ionicons name="image-outline" size={20} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: '700' }}>Attach screenshot</Text>
          </Pressable>
        )}
      </SheetField>
    </EventSheet>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proofImg: { width: 64, height: 64, borderRadius: 10 },
  addProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
});
