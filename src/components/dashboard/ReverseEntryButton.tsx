import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import axios from 'axios';
import { ModalKeyboardAvoidingView } from '../KeyboardSafeView';
import { reverseEntry } from '../../services/api';
import { getUser } from '../../services/storage';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import type { RecentExpense } from '../../types/api';
import { formatInr } from '../../utils/format';

type Props = {
  row: RecentExpense;
  maintenance?: boolean;
  onReversed: () => void;
};

const MANAGER_ROLES = ['CHAIRMAN', 'TREASURER', 'USER'];

/** "Reverse" link under an entry: cancels a wrongly recorded entry after asking for a reason. Managers only. */
export function ReverseEntryButton({ row, maintenance = false, onReversed }: Props) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [canReverse, setCanReverse] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void getUser().then((user) => {
      if (alive) setCanReverse(MANAGER_ROLES.includes(String(user?.role ?? '').toUpperCase()));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!canReverse || !row.expenseId || row.paymentType === 'OPENING') {
    return null;
  }

  const label = maintenance
    ? `${formatInr(row.amount)} maintenance for flat ${row.flatNumber || '—'}`
    : `${formatInr(row.amount)} ${(row.category || 'entry').toLowerCase()}`;

  const close = () => {
    if (saving) return;
    setOpen(false);
    setReason('');
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast('Enter a reason (at least 3 characters)', 'error');
      return;
    }
    setSaving(true);
    try {
      await reverseEntry(String(row.expenseId), trimmed);
      toast('Entry reversed', 'success');
      setOpen(false);
      setReason('');
      onReversed();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast(msg ?? 'Unable to reverse this entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.link}>
        <Text style={styles.linkText}>↺ Reverse</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <ModalKeyboardAvoidingView style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.title, { color: theme.text }]}>Reverse entry</Text>
            <Text style={[styles.body, { color: theme.text }]}>
              Reverse <Text style={styles.bold}>{label}</Text>?
            </Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              The entry is cancelled and removed from balances, dues and reports. A record is kept in the audit log.
              {maintenance
                ? " The flat's dues go back to what they were before this entry. If the member paid online, their payment is marked \"not accepted\" so they can submit it again."
                : ''}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason, e.g. Wrong amount entered"
              placeholderTextColor={theme.textMuted}
              maxLength={500}
              multiline
              style={[styles.input, { borderColor: theme.inputBorder, color: theme.text }]}
            />
            <View style={styles.actions}>
              <Pressable style={[styles.btn, { borderColor: theme.inputBorder }]} onPress={close} disabled={saving}>
                <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnDanger, saving ? styles.btnDisabled : null]}
                onPress={() => void submit()}
                disabled={saving}
              >
                <Text style={[styles.btnText, styles.btnDangerText]}>{saving ? 'Reversing…' : 'Reverse entry'}</Text>
              </Pressable>
            </View>
          </View>
        </ModalKeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-end', paddingVertical: 4 },
  linkText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, minHeight: 72, textAlignVertical: 'top', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { fontWeight: '700', fontSize: 14 },
  btnDanger: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  btnDangerText: { color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});
