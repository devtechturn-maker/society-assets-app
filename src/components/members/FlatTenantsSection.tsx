import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addFlatTenancy, endFlatTenancy, fetchFlatTenancies } from '../../services/api';
import type { FlatTenancy, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { SectionCard } from '../dashboard/SectionCard';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Living there',
  UPCOMING: 'Starts soon',
  EXPIRED: 'Rental over',
  ENDED: 'Ended',
};

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Chairman / treasurer: rent a flat to a tenant and end the rental. While a rental is in force the tenant signs in
 * with their mobile number and handles the flat's guests; the owner keeps maintenance and ownership.
 */
export function FlatTenantsSection({ members }: { members: SocietyMember[] }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [rentals, setRentals] = useState<FlatTenancy[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [flatQuery, setFlatQuery] = useState('');
  const [flatId, setFlatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState(isoDay(0));
  const [endDate, setEndDate] = useState(isoDay(364));

  const load = useCallback(async () => {
    try {
      setRentals(await fetchFlatTenancies());
    } catch (e) {
      setRentals([]);
      toast(apiErrorMessage(e, 'Could not load tenants'), 'error');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const flatMatches = useMemo(() => {
    const q = flatQuery.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => m.flatNumber.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [flatQuery, members]);
  const selectedFlat = members.find((m) => m.id === flatId) ?? null;
  const inputStyle = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  async function save() {
    if (!selectedFlat) return toast('Choose the flat', 'error');
    setSaving(true);
    try {
      await addFlatTenancy({
        flatMemberId: selectedFlat.id,
        tenantName: name.trim(),
        tenantPhone: phone.replace(/\D/g, '').slice(-10),
        tenantEmail: email.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      });
      toast(`${name.trim()} added as tenant of ${selectedFlat.flatNumber}. They sign in with their mobile number.`, 'success');
      setAdding(false);
      setFlatId(null);
      setFlatQuery('');
      setName('');
      setPhone('');
      setEmail('');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not add the tenant'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function askEnd(rental: FlatTenancy) {
    confirm({
      title: 'End rental?',
      message: `${rental.tenantName} will lose access to flat ${rental.flatNumber} now. Their unused guest passes end too.`,
      confirmText: 'End rental',
      destructive: true,
      onConfirm: () => end(rental),
    });
  }

  async function end(rental: FlatTenancy) {
    setEnding(rental.id);
    try {
      const result = await endFlatTenancy(rental.id);
      toast(
        `Rental ended. ${result.guestPassesEnded ? `${result.guestPassesEnded} guest pass(es) cancelled.` : ''}`.trim(),
        'success'
      );
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not end the rental'), 'error');
    } finally {
      setEnding(null);
    }
  }

  const current = (rentals ?? []).filter((r) => r.status === 'ACTIVE' || r.status === 'UPCOMING');
  const past = (rentals ?? []).filter((r) => r.status === 'EXPIRED' || r.status === 'ENDED').slice(0, 10);

  return (
    <SectionCard title="Tenants" subtitle="Rented flats. The tenant manages guests; the owner keeps maintenance.">
      {rentals === null ? <ActivityIndicator color={theme.accent} /> : null}
      {rentals !== null && current.length === 0 && !adding ? (
        <Text style={[styles.muted, { color: theme.textMuted }]}>No flats are rented out.</Text>
      ) : null}

      {current.map((r) => (
        <View key={r.id} style={[styles.row, { borderColor: theme.cardBorder }]}>
          <View style={styles.rowMain}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>
              {r.flatNumber} · {r.tenantName}
            </Text>
            <Text style={[styles.muted, { color: theme.textMuted }]}>
              Owner {r.ownerName} · {r.startDate} to {r.endDate} · {STATUS_LABEL[r.status] ?? r.status}
            </Text>
            <Text style={[styles.muted, { color: theme.textMuted }]}>{r.tenantPhone}</Text>
          </View>
          <Pressable disabled={ending === r.id} onPress={() => askEnd(r)} style={[styles.endBtn, { opacity: ending === r.id ? 0.6 : 1 }]}>
            <Text style={styles.endText}>{ending === r.id ? '…' : 'End'}</Text>
          </Pressable>
        </View>
      ))}

      {adding ? (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.text }]}>Flat</Text>
          {selectedFlat ? (
            <Pressable onPress={() => setFlatId(null)} style={[styles.selected, { borderColor: theme.accent }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {selectedFlat.flatNumber} · owner {selectedFlat.name}
              </Text>
              <Text style={{ color: theme.accent, fontSize: 12, marginTop: 4 }}>Change</Text>
            </Pressable>
          ) : (
            <>
              <TextInput style={inputStyle} value={flatQuery} onChangeText={setFlatQuery} placeholder="Search flat or owner" placeholderTextColor={theme.placeholder} />
              {flatMatches.map((m) => (
                <Pressable key={m.id} onPress={() => setFlatId(m.id)} style={[styles.match, { borderColor: theme.cardBorder }]}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{m.flatNumber}</Text>
                  <Text style={{ color: theme.textMuted }}>{m.name}</Text>
                </Pressable>
              ))}
            </>
          )}
          <Text style={[styles.label, { color: theme.text }]}>Tenant name</Text>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Amit Shah" placeholderTextColor={theme.placeholder} />
          <Text style={[styles.label, { color: theme.text }]}>Tenant mobile (used to sign in)</Text>
          <TextInput style={inputStyle} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={14} placeholder="10-digit mobile" placeholderTextColor={theme.placeholder} />
          <Text style={[styles.label, { color: theme.text }]}>Tenant email</Text>
          <TextInput style={inputStyle} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tenant@example.com" placeholderTextColor={theme.placeholder} />
          <View style={styles.dates}>
            <View style={styles.dateItem}>
              <Text style={[styles.label, { color: theme.text }]}>Start (YYYY-MM-DD)</Text>
              <TextInput style={inputStyle} value={startDate} onChangeText={setStartDate} />
            </View>
            <View style={styles.dateItem}>
              <Text style={[styles.label, { color: theme.text }]}>End (YYYY-MM-DD)</Text>
              <TextInput style={inputStyle} value={endDate} onChangeText={setEndDate} />
            </View>
          </View>
          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.65 : pressed ? 0.9 : 1 }]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Add tenant</Text>}
          </Pressable>
          <Pressable onPress={() => setAdding(false)} style={styles.cancel}>
            <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={[styles.secondary, { borderColor: theme.accent }]}>
          <Text style={{ color: theme.accent, fontWeight: '800' }}>Rent a flat to a tenant</Text>
        </Pressable>
      )}

      {past.length ? (
        <>
          <Text style={[styles.label, { color: theme.text }]}>Past rentals</Text>
          {past.map((r) => (
            <Text key={r.id} style={[styles.muted, { color: theme.textMuted }]}>
              {r.flatNumber} · {r.tenantName} · {r.startDate} to {r.endDate} · {STATUS_LABEL[r.status] ?? r.status}
            </Text>
          ))}
        </>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 12, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  endBtn: { borderWidth: 1, borderColor: '#b91c1c', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  endText: { color: '#b91c1c', fontWeight: '800', fontSize: 12 },
  form: { marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  selected: { borderWidth: 1, borderRadius: 12, padding: 12 },
  match: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6 },
  dates: { flexDirection: 'row', gap: 10 },
  dateItem: { flex: 1 },
  primary: { marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { marginTop: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancel: { alignItems: 'center', paddingVertical: 12 },
});
