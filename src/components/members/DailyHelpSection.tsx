import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { addMyHelper, fetchHelperMonth, fetchMyHelpers, removeMyHelper } from '../../services/api';
import type { DailyHelper, HelperMonth } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { SectionCard } from '../dashboard/SectionCard';

const TYPES = ['MAID', 'COOK', 'DRIVER', 'NANNY', 'CLEANER', 'OTHER'];
const label = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

function hm(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** v22: the flat's maid, cook, driver… each gets a 6-digit gate pass. The guard marks In / Out and you get a notification. */
export function DailyHelpSection() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [rows, setRows] = useState<DailyHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [type, setType] = useState('MAID');
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState<HelperMonth | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchMyHelpers());
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load daily help'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    Keyboard.dismiss();
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (!name.trim()) return toast('Enter the name', 'error');
    if (digits && digits.length !== 10) return toast('Enter a 10-digit mobile number', 'error');
    setSaving(true);
    try {
      const h = await addMyHelper({ name: name.trim(), workType: type, mobileNumber: digits || undefined });
      setName('');
      setMobile('');
      setAdding(false);
      toast(`Pass code for ${h.name}: ${h.passCode}`, 'success');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not add'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function openMonth(h: DailyHelper) {
    try {
      setMonth(await fetchHelperMonth(h.id));
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load attendance'), 'error');
    }
  }

  const inputStyle = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  if (month) {
    return (
      <SectionCard title={`${month.helper.name} · ${month.month}`} subtitle={`Came on ${month.daysPresent} day(s) this month`}>
        {month.visits.length === 0 ? <Text style={{ color: theme.textMuted }}>No gate entries this month.</Text> : null}
        {month.visits.map((v) => (
          <Text key={v.id} style={[styles.meta, { color: theme.text }]}>
            {new Date(v.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })} · in {hm(v.inTime)} · out {hm(v.outTime)}
          </Text>
        ))}
        <Pressable onPress={() => setMonth(null)} style={styles.link}>
          <Text style={{ color: theme.accent, fontWeight: '800' }}>← Back</Text>
        </Pressable>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Daily help"
      subtitle="Maid, cook, driver… Give the pass code to them; the guard marks In and Out and you get a notification."
    >
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {!loading && rows.length === 0 && !adding ? <Text style={{ color: theme.textMuted }}>No daily help added yet.</Text> : null}
      {rows.map((h) => (
        <View key={h.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>
            {h.name} · {label(h.workType)}
          </Text>
          <Text style={[styles.code, { color: theme.accent }]}>Pass code {h.passCode}</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => void Share.share({ message: `Your gate pass code for our society is ${h.passCode}. Show it to the guard when you come in and go out.` })}
              style={[styles.smallBtn, { borderColor: theme.accent }]}
            >
              <Text style={{ color: theme.accent, fontWeight: '800' }}>Share code</Text>
            </Pressable>
            <Pressable onPress={() => void openMonth(h)} style={[styles.smallBtn, { borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>Attendance</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                confirm({
                  title: `Remove ${h.name}?`,
                  message: 'The pass code will stop working at the gate.',
                  confirmText: 'Remove',
                  destructive: true,
                  onConfirm: async () => {
                    try {
                      await removeMyHelper(h.id);
                      await load();
                    } catch (e) {
                      toast(apiErrorMessage(e, 'Could not remove'), 'error');
                    }
                  },
                })
              }
              style={[styles.smallBtn, { borderColor: theme.cardBorder }]}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {adding ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.placeholder} maxLength={120} />
          <TextInput style={inputStyle} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={14} placeholder="Mobile (optional)" placeholderTextColor={theme.placeholder} />
          <View style={styles.row}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, { borderColor: type === t ? theme.accent : theme.cardBorder, backgroundColor: type === t ? theme.accent : theme.cardBg }]}
              >
                <Text style={{ color: type === t ? '#fff' : theme.text, fontWeight: '700', fontSize: 13 }}>{label(t)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Pressable disabled={saving} onPress={() => void add()} style={[styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}>
              <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Add and get pass code'}</Text>
            </Pressable>
            <Pressable onPress={() => setAdding(false)} style={styles.link}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={[styles.primary, { backgroundColor: theme.accent, marginTop: 10 }]}>
          <Text style={styles.primaryText}>+ Add daily help</Text>
        </Pressable>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 16 },
  item: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  code: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  meta: { fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  smallBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  primary: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  link: { paddingVertical: 10, paddingHorizontal: 6 },
});
