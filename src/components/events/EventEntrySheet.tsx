import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { recordEventEntry } from '../../services/api';
import type {
  EventCategoryOption,
  EventContributionRow,
  EventEntryKind,
  EventPaymentMethod,
  EventTransaction,
} from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import { todayIsoDate } from '../../utils/dates';
import { PAYMENT_METHODS, compactInr } from '../../utils/eventFormat';
import { pickPhotoFromCamera, pickPhotoFromLibrary, showPhotoSourcePicker, type PickedPhoto } from '../../utils/pickPhoto';
import { ChipRow, EventSheet, SheetButtons, SheetField, SheetInput } from './EventSheet';

const KINDS: { label: string; value: EventEntryKind }[] = [
  { label: 'Flat contribution', value: 'CONTRIBUTION' },
  { label: 'Other income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' },
];

const MAX_RECEIPTS = 3;

/** Record a flat contribution, other income or an expense (staff + committee). */
export function EventEntrySheet({
  visible,
  eventId,
  initialKind,
  presetFlatId,
  contributions,
  categories,
  isStaff,
  voluntary,
  onClose,
  onSaved,
}: {
  visible: boolean;
  eventId: string;
  initialKind: EventEntryKind;
  presetFlatId?: string | null;
  contributions: EventContributionRow[];
  categories: { income: EventCategoryOption[]; expense: EventCategoryOption[] };
  isStaff: boolean;
  voluntary: boolean;
  onClose: () => void;
  onSaved: (txn: EventTransaction) => void;
}) {
  const { theme } = useTheme();
  const { confirm, toast } = useAppAlert();
  const [kind, setKind] = useState<EventEntryKind>(initialKind);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [flatQuery, setFlatQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<EventPaymentMethod>('CASH');
  const [category, setCategory] = useState<string | null>(null);
  const [party, setParty] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paid, setPaid] = useState(true);
  const [txnDate, setTxnDate] = useState(todayIsoDate());
  const [receipts, setReceipts] = useState<PickedPhoto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKind(initialKind);
    setFlatId(presetFlatId ?? null);
    setFlatQuery('');
    setMethod('CASH');
    setCategory(null);
    setParty('');
    setReference('');
    setNote('');
    setPaid(true);
    setTxnDate(todayIsoDate());
    setReceipts([]);
    setSaving(false);
    const preset = contributions.find((row) => row.flatId === presetFlatId);
    setAmount(preset && preset.remaining > 0 ? String(preset.remaining) : '');
  }, [visible, initialKind, presetFlatId, contributions]);

  const payableFlats = useMemo(
    () => contributions.filter((row) => row.status !== 'EXEMPT' && (voluntary || row.remaining > 0)),
    [contributions, voluntary]
  );

  const matchingFlats = useMemo(() => {
    const q = flatQuery.trim().toLowerCase();
    const rows = q
      ? payableFlats.filter(
          (row) => row.flatNumber.toLowerCase().includes(q) || (row.memberName ?? '').toLowerCase().includes(q)
        )
      : payableFlats;
    return rows.slice(0, 6);
  }, [payableFlats, flatQuery]);

  const selectedFlat = contributions.find((row) => row.flatId === flatId) ?? null;
  const categoryOptions = (kind === 'INCOME' ? categories.income : categories.expense).map((c) => ({
    label: c.label,
    value: c.code,
  }));
  const needsMethod = kind !== 'EXPENSE' || paid;

  function chooseFlat(row: EventContributionRow) {
    setFlatId(row.flatId);
    if (row.remaining > 0) setAmount(String(row.remaining));
  }

  function addReceipt() {
    if (receipts.length >= MAX_RECEIPTS) {
      toast(`Up to ${MAX_RECEIPTS} bills per entry`, 'info');
      return;
    }
    const add = (photo: PickedPhoto | null) => {
      if (photo) setReceipts((current) => [...current, photo].slice(0, MAX_RECEIPTS));
    };
    showPhotoSourcePicker(
      () => void pickPhotoFromCamera().then(add),
      () => void pickPhotoFromLibrary().then(add)
    );
  }

  function validate(): string | null {
    if (kind === 'CONTRIBUTION' && !flatId) return 'Choose the flat that paid.';
    if (kind !== 'CONTRIBUTION' && !category) return 'Choose a category.';
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return 'Enter an amount greater than zero.';
    if (kind === 'CONTRIBUTION' && selectedFlat && !voluntary && value > selectedFlat.remaining) {
      return `Only ${compactInr(selectedFlat.remaining)} is remaining for ${selectedFlat.flatNumber}.`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(txnDate)) return 'Date must be YYYY-MM-DD.';
    return null;
  }

  async function save(confirmDuplicate = false) {
    const problem = validate();
    if (problem) {
      toast(problem, 'warning');
      return;
    }
    setSaving(true);
    try {
      const txn = await recordEventEntry(
        eventId,
        {
          kind,
          amount: Number(amount),
          txnDate,
          paymentMethod: needsMethod ? method : null,
          referenceNo: reference.trim() || null,
          description: note.trim() || null,
          flatId: kind === 'CONTRIBUTION' ? flatId ?? undefined : undefined,
          categoryCode: kind !== 'CONTRIBUTION' ? category ?? undefined : undefined,
          partyName: kind !== 'CONTRIBUTION' ? party.trim() || null : undefined,
          paid: kind === 'EXPENSE' ? paid : undefined,
          confirmDuplicate,
        },
        kind === 'CONTRIBUTION' ? [] : receipts
      );
      toast(txn.status === 'PENDING_APPROVAL' ? 'Sent for approval' : 'Saved', 'success');
      if (txn.budgetWarning) toast(txn.budgetWarning, 'warning');
      onSaved(txn);
      onClose();
    } catch (err) {
      const code = axios.isAxiosError(err) ? (err.response?.data as { code?: string } | undefined)?.code : undefined;
      if (code === 'POSSIBLE_DUPLICATE') {
        confirm({
          title: 'Possible duplicate',
          message: apiErrorMessage(err),
          confirmText: 'Save anyway',
          onConfirm: () => save(true),
        });
      } else {
        toast(apiErrorMessage(err, 'Could not save'), 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventSheet
      visible={visible}
      title="Add money entry"
      onClose={onClose}
      footer={<SheetButtons onCancel={onClose} onSave={() => void save()} saving={saving} />}
    >
      <View style={[styles.segment, { backgroundColor: theme.chipBg }]} accessibilityRole="tablist">
        {KINDS.map((k) => {
          const active = k.value === kind;
          return (
            <Pressable
              key={k.value}
              onPress={() => setKind(k.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentBtn, active ? { backgroundColor: theme.cardBg } : null]}
            >
              <Text
                style={[styles.segmentText, { color: active ? theme.text : theme.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {k.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kind === 'CONTRIBUTION' ? (
        <SheetField label="Flat">
          {selectedFlat ? (
            <Pressable
              onPress={() => setFlatId(null)}
              style={[styles.selectedFlat, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
              accessibilityLabel={`Selected ${selectedFlat.flatNumber}. Tap to change`}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.flatNo, { color: theme.text }]}>{selectedFlat.flatNumber}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {selectedFlat.memberName ?? 'Vacant'}
                  {!voluntary ? ` · ${compactInr(selectedFlat.remaining)} remaining` : ''}
                </Text>
              </View>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Change</Text>
            </Pressable>
          ) : (
            <>
              <SheetInput value={flatQuery} onChangeText={setFlatQuery} placeholder="Search flat or name" autoCorrect={false} />
              {matchingFlats.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {payableFlats.length === 0 ? 'Every flat has paid in full.' : 'No matching flat.'}
                </Text>
              ) : (
                <View style={[styles.flatList, { borderColor: theme.cardBorder }]}>
                  {matchingFlats.map((row, index) => (
                    <Pressable
                      key={row.flatId}
                      onPress={() => chooseFlat(row)}
                      style={({ pressed }) => [
                        styles.flatRow,
                        index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider } : null,
                        pressed ? { backgroundColor: theme.chipBg } : null,
                      ]}
                    >
                      <Text style={[styles.flatNo, { color: theme.text }]}>{row.flatNumber}</Text>
                      <Text style={[styles.flatName, { color: theme.textMuted }]} numberOfLines={1}>
                        {row.memberName ?? 'Vacant'}
                      </Text>
                      {!voluntary ? (
                        <Text style={[styles.flatDue, { color: theme.warning }]}>{compactInr(row.remaining)}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </SheetField>
      ) : (
        <SheetField label="Category">
          <ChipRow options={categoryOptions} value={category} onChange={setCategory} />
        </SheetField>
      )}

      <SheetField label="Amount">
        <SheetInput large value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="₹ 0" />
      </SheetField>

      {kind !== 'CONTRIBUTION' ? (
        <SheetField label={kind === 'EXPENSE' ? 'Paid to' : 'Received from'} hint="optional">
          <SheetInput
            value={party}
            onChangeText={setParty}
            placeholder={kind === 'EXPENSE' ? 'Vendor, e.g. Shree Decorators' : 'Sponsor or donor name'}
            maxLength={120}
          />
        </SheetField>
      ) : null}

      {kind === 'EXPENSE' ? (
        <View style={[styles.segment, { backgroundColor: theme.chipBg }]}>
          {[
            { label: 'Already paid', value: true },
            { label: 'Bill to pay later', value: false },
          ].map((option) => {
            const active = option.value === paid;
            return (
              <Pressable
                key={option.label}
                onPress={() => setPaid(option.value)}
                style={[styles.segmentBtn, active ? { backgroundColor: theme.cardBg } : null]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, { color: active ? theme.text : theme.textMuted }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {needsMethod ? (
        <SheetField label="Paid by">
          <ChipRow options={PAYMENT_METHODS} value={method} onChange={setMethod} />
        </SheetField>
      ) : null}

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <SheetField label="Date">
            <SheetInput value={txnDate} onChangeText={setTxnDate} placeholder="YYYY-MM-DD" maxLength={10} />
          </SheetField>
        </View>
        <View style={{ flex: 1.3 }}>
          <SheetField label="Reference" hint="optional">
            <SheetInput value={reference} onChangeText={setReference} placeholder="UPI / cheque no." autoCapitalize="characters" maxLength={80} />
          </SheetField>
        </View>
      </View>

      <SheetField label="Note" hint="optional">
        <SheetInput value={note} onChangeText={setNote} placeholder="e.g. Stage decoration" maxLength={500} />
      </SheetField>

      {kind !== 'CONTRIBUTION' ? (
        <SheetField label="Bill / receipt" hint="optional">
          <View style={styles.receipts}>
            {receipts.map((photo, index) => (
              <View key={photo.uri} style={styles.receipt}>
                <Image source={{ uri: photo.uri }} style={styles.receiptImg} />
                <Pressable
                  onPress={() => setReceipts((current) => current.filter((_, i) => i !== index))}
                  style={styles.receiptRemove}
                  accessibilityLabel="Remove bill photo"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {receipts.length < MAX_RECEIPTS ? (
              <Pressable
                onPress={addReceipt}
                style={[styles.addReceipt, { borderColor: theme.inputBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Add bill photo"
              >
                <Ionicons name="camera-outline" size={22} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>Add photo</Text>
              </Pressable>
            ) : null}
          </View>
        </SheetField>
      ) : null}

      {kind === 'EXPENSE' && !isStaff ? (
        <View style={[styles.note, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="information-circle-outline" size={16} color="#92400e" />
          <Text style={styles.noteText}>The chairman or treasurer will approve this expense.</Text>
        </View>
      ) : null}
    </EventSheet>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center' },
  segmentText: { fontSize: 13.5, fontWeight: '700' },
  selectedFlat: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 10 },
  flatList: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  flatNo: { fontSize: 15, fontWeight: '800', minWidth: 58 },
  flatName: { flex: 1, fontSize: 14 },
  flatDue: { fontSize: 14, fontWeight: '700' },
  row2: { flexDirection: 'row', gap: 10 },
  receipts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  receipt: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  receiptImg: { width: '100%', height: '100%' },
  receiptRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReceipt: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 12 },
  noteText: { color: '#92400e', fontSize: 13, flex: 1 },
});
