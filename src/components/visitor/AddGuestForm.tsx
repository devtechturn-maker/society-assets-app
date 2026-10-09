import { useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addGuestPass } from '../../services/api';
import { apiErrorMessage } from '../../utils/apiError';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { SectionCard } from '../dashboard/SectionCard';

const RELATIONSHIPS = ['Friend', 'Family', 'Relative', 'Worker', 'Delivery', 'Other'];
const DAYS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'Day after', offset: 2 },
];
const HOURS = [2, 4, 8, 12, 24];

/** Builds a local start time ("now" when today and no time typed). Returns null for a bad time. */
function startTime(dayOffset: number, time: string): Date | null {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  if (!time.trim()) {
    return dayOffset === 0 ? now : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0);
  }
  const match = time.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  start.setHours(h, m, 0, 0);
  return start;
}

function formatTime(d: Date): string {
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Resident (owner or active tenant) adds a guest who can be let in at the gate between the chosen times. */
export function AddGuestForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [purpose, setPurpose] = useState('');
  const [count, setCount] = useState('1');
  const [day, setDay] = useState(0);
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(4);
  const [saving, setSaving] = useState(false);

  const from = startTime(day, time);
  const until = from ? new Date(from.getTime() + hours * 3600 * 1000) : null;
  const inputStyle = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  async function submit() {
    Keyboard.dismiss();
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (!name.trim()) return toast('Enter the guest name', 'error');
    if (digits.length !== 10) return toast('Enter a 10-digit mobile number', 'error');
    if (!from || !until) return toast('Enter the time as HH:MM, for example 18:30', 'error');
    setSaving(true);
    try {
      await addGuestPass({
        guestName: name.trim(),
        mobileNumber: digits,
        relationship,
        purpose: purpose.trim() || undefined,
        visitorCount: Math.max(1, Number(count) || 1),
        validFrom: from.toISOString(),
        validUntil: until.toISOString(),
      });
      toast(`${name.trim()} can enter between ${formatTime(from)} and ${formatTime(until)}`, 'success');
      onAdded();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not add guest'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const chip = (selected: boolean) => [
    styles.chip,
    { borderColor: selected ? theme.accent : theme.cardBorder, backgroundColor: selected ? theme.accent : theme.cardBg },
  ];
  const chipText = (selected: boolean) => [styles.chipText, { color: selected ? '#fff' : theme.text }];

  return (
    <SectionCard title="Add a guest" subtitle="The gate can let them in during the time you choose">
      <Text style={[styles.label, { color: theme.text }]}>Guest name</Text>
      <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Priya Patel" placeholderTextColor={theme.placeholder} />

      <Text style={[styles.label, { color: theme.text }]}>Mobile number</Text>
      <TextInput style={inputStyle} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={14} placeholder="10-digit mobile" placeholderTextColor={theme.placeholder} />

      <Text style={[styles.label, { color: theme.text }]}>Relationship</Text>
      <View style={styles.chips}>
        {RELATIONSHIPS.map((r) => (
          <Pressable key={r} style={chip(relationship === r)} onPress={() => setRelationship(r)}>
            <Text style={chipText(relationship === r)}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Purpose (optional)</Text>
      <TextInput style={inputStyle} value={purpose} onChangeText={setPurpose} placeholder="Personal visit" placeholderTextColor={theme.placeholder} />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={[styles.label, { color: theme.text }]}>Arrives at (HH:MM)</Text>
          <TextInput style={inputStyle} value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" placeholder={day === 0 ? 'Now' : '09:00'} placeholderTextColor={theme.placeholder} />
        </View>
        <View style={styles.rowItem}>
          <Text style={[styles.label, { color: theme.text }]}>Guests</Text>
          <TextInput style={inputStyle} value={count} onChangeText={setCount} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Day</Text>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <Pressable key={d.label} style={chip(day === d.offset)} onPress={() => setDay(d.offset)}>
            <Text style={chipText(day === d.offset)}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Pass valid for</Text>
      <View style={styles.chips}>
        {HOURS.map((h) => (
          <Pressable key={h} style={chip(hours === h)} onPress={() => setHours(h)}>
            <Text style={chipText(hours === h)}>{h} hours</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.summary, { color: theme.textMuted }]}>
        {from && until ? `Valid ${formatTime(from)} to ${formatTime(until)}` : 'Enter the time as HH:MM'}
      </Text>

      <Pressable
        onPress={() => void submit()}
        disabled={saving}
        style={({ pressed }) => [styles.submit, { backgroundColor: theme.accent, opacity: saving ? 0.65 : pressed ? 0.9 : 1 }]}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add guest</Text>}
      </Pressable>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  rowItem: { flex: 1 },
  summary: { marginTop: 12, fontSize: 13 },
  submit: { marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
});
