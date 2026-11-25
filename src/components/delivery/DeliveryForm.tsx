import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDelivery, searchResidentsForVisitor } from '../../services/api';
import type { ResidentSearchResult } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { SectionCard } from '../dashboard/SectionCard';
import { apiErrorMessage } from '../../utils/apiError';
import { unitName } from '../../utils/unitName';
import { PhoneInput } from '../form/PhoneInput';

export const DELIVERY_COMPANIES = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Courier'] as const;
export const DELIVERY_TYPES = [
  { value: 'PARCEL', label: 'Parcel' },
  { value: 'FOOD', label: 'Food' },
  { value: 'GROCERY', label: 'Grocery' },
  { value: 'COURIER', label: 'Courier' },
  { value: 'OTHER', label: 'Other' },
] as const;

/** Guard: one delivery person for one or more flats. Each flat is asked separately. */
export function DeliveryForm({ onDone }: { onDone?: () => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [company, setCompany] = useState('');
  const [type, setType] = useState<string>('PARCEL');
  const [mobile, setMobile] = useState('');
  const [personName, setPersonName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResidentSearchResult[]>([]);
  const [flats, setFlats] = useState<ResidentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      searchResidentsForVisitor(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  function chip(label: string, active: boolean, onPress: () => void, key: string) {
    return (
      <Pressable
        key={key}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
            borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
          },
        ]}
      >
        <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      </Pressable>
    );
  }

  async function submit() {
    Keyboard.dismiss();
    if (!company.trim()) {
      toast('Choose or type the delivery company', 'error');
      return;
    }
    if (mobile.length !== 10) {
      toast('Enter the delivery person’s 10-digit mobile', 'error');
      return;
    }
    if (flats.length === 0) {
      toast('Add at least one flat', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await createDelivery({
        company: company.trim(),
        deliveryType: type,
        mobileNumber: mobile,
        deliveryPersonName: personName.trim() || undefined,
        memberIds: flats.map((f) => f.memberId),
      });
      const noApp = result.entries.filter((e) => e.residentOnApp === false).length;
      toast(
        noApp > 0
          ? `Saved for ${result.entries.length} flat(s). ${noApp} without the app: call them, or keep the parcel at the gate.`
          : `Saved. ${result.entries.length} flat(s) notified.`,
        'success'
      );
      setCompany('');
      setType('PARCEL');
      setMobile('');
      setPersonName('');
      setFlats([]);
      setQuery('');
      onDone?.();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save the delivery'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const companyIsCustom = company !== '' && !DELIVERY_COMPANIES.includes(company as (typeof DELIVERY_COMPANIES)[number]);

  return (
    <View>
      <Text style={[styles.title, { color: theme.text }]}>Delivery Entry</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        One delivery person can serve several flats. Each flat gets its own request. If nobody answers, keep the parcel
        at the gate from History → Deliveries.
      </Text>

      <SectionCard title="Company *" subtitle="Who is delivering?">
        <View style={styles.chipRow}>
          {DELIVERY_COMPANIES.map((c) => chip(c, company === c, () => setCompany(c), c))}
        </View>
        <TextInput
          value={companyIsCustom ? company : ''}
          onChangeText={setCompany}
          style={input}
          placeholder="Or type another company"
          placeholderTextColor={theme.placeholder}
          maxLength={60}
        />
        <Text style={[styles.label, { color: theme.textMuted }]}>Type</Text>
        <View style={styles.chipRow}>
          {DELIVERY_TYPES.map((t) => chip(t.label, type === t.value, () => setType(t.value), t.value))}
        </View>
      </SectionCard>

      <SectionCard title="Delivery person" subtitle="Mobile is required">
        <PhoneInput
          value={mobile}
          onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
          style={input}
          placeholder="10-digit mobile *"
          placeholderTextColor={theme.placeholder}
          maxLength={10}
        />
        <TextInput
          value={personName}
          onChangeText={setPersonName}
          style={[input, { marginTop: 10 }]}
          placeholder="Name (optional)"
          placeholderTextColor={theme.placeholder}
          maxLength={120}
        />
      </SectionCard>

      <SectionCard title="Flats *" subtitle="Search and add every flat this person is delivering to">
        {flats.length > 0 ? (
          <View style={styles.chipRow}>
            {flats.map((f) => (
              <Pressable
                key={f.memberId}
                onPress={() => setFlats((rows) => rows.filter((r) => r.memberId !== f.memberId))}
                style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
                accessibilityLabel={`Remove ${unitName(f.flatNumber)}`}
              >
                <Text style={{ color: theme.accent, fontWeight: '700' }}>
                  {unitName(f.flatNumber)}
                  {f.residentOnApp === false ? ' (no app)' : ''} ✕
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <TextInput
          value={query}
          onChangeText={setQuery}
          style={input}
          placeholder="Flat number or name"
          placeholderTextColor={theme.placeholder}
          autoCapitalize="characters"
        />
        {searching ? <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} /> : null}
        {results
          .filter((r) => !flats.some((f) => f.memberId === r.memberId))
          .map((r) => (
            <Pressable
              key={r.memberId}
              onPress={() => {
                setFlats((rows) => [...rows, r]);
                setQuery('');
              }}
              style={[styles.result, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{unitName(r.flatNumber)}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {r.name}
                  {r.residentOnApp === false ? ' · no app, call them' : ''}
                </Text>
              </View>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Add</Text>
            </Pressable>
          ))}
      </SectionCard>

      <Pressable
        onPress={() => void submit()}
        disabled={saving}
        style={[styles.submit, { backgroundColor: theme.accent, opacity: saving ? 0.65 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            Save delivery{flats.length > 1 ? ` for ${flats.length} flats` : ''} & notify
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  result: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  submit: { marginTop: 4, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
