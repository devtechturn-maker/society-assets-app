import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ModalKeyboardAvoidingView } from '../KeyboardSafeView';
import { getUser } from '../../services/storage';
import { waiveLateFee } from '../../services/api';
import type { RecentExpense } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { formatInr } from '../../utils/format';

/** Chairman only: waive the unpaid late fee on a flat's latest maintenance entry, with a reason. */
export function WaiveLateFeeButton({ row, onWaived }: { row: RecentExpense; onWaived: () => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [isChairman, setIsChairman] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void getUser().then((user) => {
      if (alive) setIsChairman(String(user?.role ?? '').toUpperCase() === 'CHAIRMAN');
    });
    return () => {
      alive = false;
    };
  }, []);

  const fee = row.penaltyAmount ?? 0;
  const left = row.remainingDueAmount ?? 0;
  if (!isChairman || fee <= 0 || left <= 0 || !row.expenseId) {
    return null;
  }

  async function submit() {
    if (reason.trim().length < 3) {
      toast('Enter why the late fee is waived', 'error');
      return;
    }
    setSaving(true);
    try {
      const out = await waiveLateFee(String(row.expenseId), reason.trim());
      toast(`Late fee of ${formatInr(out.waived)} waived`, 'success');
      setOpen(false);
      setReason('');
      onWaived();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not waive the late fee'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.link}>
        <Text style={{ color: theme.accent, fontWeight: '700' }}>Waive late fee</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <ModalKeyboardAvoidingView style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.cardBg }]}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>Waive late fee</Text>
            <Text style={{ color: theme.textMuted }}>
              Flat {row.flatNumber}: up to {formatInr(Math.min(fee, left))} is waived and the balance goes down by the same.
              The reason is kept in the activity log.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason, e.g. Member was in hospital"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              maxLength={300}
              multiline
              autoFocus
            />
            <View style={styles.row}>
              <Pressable onPress={() => setOpen(false)} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submit()} disabled={saving} style={[styles.primary, { backgroundColor: theme.accent }]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Waive</Text>}
              </Pressable>
            </View>
          </View>
        </ModalKeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { paddingVertical: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { borderRadius: 18, padding: 18, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  primary: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
});
