import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { createCharge, endCharge, fetchCharges, fetchMembers, fetchMeterReadings, saveMeterReadings, updateCharge } from '../../services/api';
import type { ChargeHeadRow, ChargeList, ChargeMethod, ChargeTarget, MeterReadingSheet, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { formatInr } from '../../utils/format';
import { unitName } from '../../utils/unitName';

const METHODS: { value: ChargeMethod; label: string; rateLabel: string }[] = [
  { value: 'FIXED', label: 'Fixed per unit', rateLabel: 'Amount per unit (₹)' },
  { value: 'PERCENT_OF_MAINTENANCE', label: '% of maintenance', rateLabel: 'Percent (%)' },
  { value: 'PER_SQFT', label: 'Per sq ft', rateLabel: '₹ per sq ft' },
  { value: 'PER_VEHICLE', label: 'Per vehicle', rateLabel: '₹ per 4-wheeler' },
  { value: 'METERED', label: 'By meter reading', rateLabel: '₹ per unit used' },
];

const TARGETS: { value: ChargeTarget; label: string }[] = [
  { value: 'ALL', label: 'All units' },
  { value: 'FLATS', label: 'Flats only' },
  { value: 'SHOPS', label: 'Shops only' },
  { value: 'RENTED', label: 'Rented flats only' },
  { value: 'SELECTED', label: 'Chosen flats' },
];

type Form = {
  chargeId?: string;
  name: string;
  kind: 'MONTHLY' | 'ONE_TIME';
  method: ChargeMethod;
  rate: string;
  twoWheelerRate: string;
  appliesTo: ChargeTarget;
  selected: string[];
  fromMonth: string;
  gstApplicable: boolean;
};

function emptyForm(month: string): Form {
  return { name: '', kind: 'MONTHLY', method: 'FIXED', rate: '', twoWheelerRate: '', appliesTo: 'ALL', selected: [], fromMonth: month, gstApplicable: false };
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Settings → Charges: sinking fund, parking, water, levies. Optional; nothing changes for a society that adds none.
 * A change applies from this month; earlier months keep their amount.
 */
export function ChargesSection() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [data, setData] = useState<ChargeList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [flats, setFlats] = useState<SocietyMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<MeterReadingSheet | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetchCharges()
      .then((d) => (setData(d), setError(null)))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load charges')));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (form?.appliesTo === 'SELECTED' && flats.length === 0) {
      fetchMembers().then(setFlats).catch(() => setFlats([]));
    }
  }, [form?.appliesTo, flats.length]);

  async function save() {
    if (!form) return;
    if (form.name.trim().length < 2 || !(Number(form.rate) > 0)) {
      toast('Enter a name and a rate above 0', 'error');
      return;
    }
    const body = {
      name: form.name.trim(),
      kind: form.kind,
      method: form.method,
      rate: Number(form.rate),
      twoWheelerRate: form.method === 'PER_VEHICLE' && form.twoWheelerRate ? Number(form.twoWheelerRate) : undefined,
      appliesTo: form.appliesTo,
      selectedMemberIds: form.appliesTo === 'SELECTED' ? form.selected : undefined,
      fromMonth: form.fromMonth,
      gstApplicable: form.gstApplicable,
    };
    setBusy(true);
    try {
      setData(form.chargeId ? await updateCharge(form.chargeId, body) : await createCharge(body));
      toast(form.chargeId ? 'Charge changed from this month' : 'Charge added', 'success');
      setForm(null);
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save the charge'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function stop(c: ChargeHeadRow) {
    const future = c.fromMonth > (data?.thisMonth ?? '');
    confirm({
      title: future ? `Delete ${c.name}?` : `End ${c.name}?`,
      message: future ? 'It has not been charged yet.' : 'It stops from this month. Earlier months keep it.',
      confirmText: future ? 'Delete' : 'End charge',
      destructive: true,
      onConfirm: async () => {
        try {
          setData(await endCharge(c.chargeId));
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not end the charge'), 'error');
        }
      },
    });
  }

  async function openReadings(c: ChargeHeadRow, month: string) {
    try {
      const s = await fetchMeterReadings(c.chargeId, month);
      setSheet(s);
      setDraft(Object.fromEntries(s.rows.map((r) => [r.memberId, r.current == null ? '' : String(r.current)])));
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load readings'), 'error');
    }
  }

  async function saveReadings() {
    if (!sheet) return;
    setBusy(true);
    try {
      const s = await saveMeterReadings(sheet.chargeId, sheet.month, Object.entries(draft).map(([memberId, reading]) => ({ memberId, reading })));
      setSheet(s);
      toast('Readings saved', 'success');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save readings'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ListError message={error} />;
  if (!data) return <ActivityIndicator color={theme.accent} />;
  const input = [styles.input, { borderColor: theme.inputBorder, color: theme.inputText, backgroundColor: theme.inputBg }];

  if (sheet) {
    return (
      <View style={styles.gap}>
        <Pressable onPress={() => setSheet(null)}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← Back to charges</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontWeight: '800' }}>
          {sheet.name} readings · {formatInr(sheet.rate)} per unit
        </Text>
        <View style={styles.monthRow}>
          <Pressable onPress={() => void openReadings({ chargeId: sheet.chargeId } as ChargeHeadRow, shiftMonth(sheet.month, -1))}>
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>‹</Text>
          </Pressable>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{sheet.month}</Text>
          <Pressable onPress={() => void openReadings({ chargeId: sheet.chargeId } as ChargeHeadRow, shiftMonth(sheet.month, 1))}>
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Enter the meter reading at the end of the month. Units used = this month − last month.
        </Text>
        {sheet.rows.map((r) => (
          <View key={r.memberId} style={[styles.readingRow, { borderColor: theme.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{unitName(r.flatNumber)}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Last month {r.previous ?? '—'}
                {r.units != null ? ` · ${r.units} units · ${formatInr(r.amount ?? 0)}` : ''}
              </Text>
            </View>
            <TextInput
              value={draft[r.memberId] ?? ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, [r.memberId]: t.replace(/[^0-9.]/g, '') }))}
              placeholder="Reading"
              placeholderTextColor={theme.placeholder}
              keyboardType="decimal-pad"
              style={[input, { width: 110 }]}
              editable={data.canManage}
            />
          </View>
        ))}
        {data.canManage ? (
          <Pressable onPress={() => void saveReadings()} disabled={busy} style={[styles.btn, { backgroundColor: theme.accent }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save readings</Text>}
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (form) {
    const method = METHODS.find((m) => m.value === form.method)!;
    return (
      <View style={styles.gap}>
        <Text style={{ color: theme.text, fontWeight: '800' }}>{form.chargeId ? 'Change charge (from this month)' : 'Add a charge'}</Text>
        <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Name, e.g. Sinking fund" placeholderTextColor={theme.placeholder} style={input} maxLength={80} />
        <View style={styles.chips}>
          {(['MONTHLY', 'ONE_TIME'] as const).map((k) => (
            <Chip key={k} label={k === 'MONTHLY' ? 'Every month' : 'One time'} on={form.kind === k} onPress={() => setForm({ ...form, kind: k })} />
          ))}
        </View>
        <Text style={[styles.label, { color: theme.textMuted }]}>How it is worked out</Text>
        <View style={styles.chips}>
          {METHODS.map((m) => (
            <Chip key={m.value} label={m.label} on={form.method === m.value} onPress={() => setForm({ ...form, method: m.value })} />
          ))}
        </View>
        <TextInput value={form.rate} onChangeText={(t) => setForm({ ...form, rate: t.replace(/[^0-9.]/g, '') })} placeholder={method.rateLabel} placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" style={input} />
        {form.method === 'PER_VEHICLE' ? (
          <TextInput value={form.twoWheelerRate} onChangeText={(t) => setForm({ ...form, twoWheelerRate: t.replace(/[^0-9.]/g, '') })} placeholder="₹ per 2-wheeler (optional)" placeholderTextColor={theme.placeholder} keyboardType="decimal-pad" style={input} />
        ) : null}
        {form.method === 'PER_VEHICLE' ? <Hint text="Vehicles come from each flat's vehicle list in the Directory." /> : null}
        {form.method === 'PER_SQFT' ? <Hint text="Set each flat's area under Flat areas. Flats without an area pay 0 for this charge." /> : null}
        {form.method === 'METERED' ? <Hint text="After saving, enter readings every month with the Readings button." /> : null}
        <Text style={[styles.label, { color: theme.textMuted }]}>Who pays</Text>
        <View style={styles.chips}>
          {TARGETS.map((t) => (
            <Chip key={t.value} label={t.label} on={form.appliesTo === t.value} onPress={() => setForm({ ...form, appliesTo: t.value })} />
          ))}
        </View>
        {form.appliesTo === 'SELECTED' ? (
          <View style={styles.chips}>
            {flats.map((f) => {
              const on = form.selected.includes(f.id);
              return (
                <Chip
                  key={f.id}
                  label={unitName(f.flatNumber)}
                  on={on}
                  onPress={() => setForm({ ...form, selected: on ? form.selected.filter((x) => x !== f.id) : [...form.selected, f.id] })}
                />
              );
            })}
          </View>
        ) : null}
        <Text style={[styles.label, { color: theme.textMuted }]}>{form.kind === 'ONE_TIME' ? 'Month' : 'Starts from'}</Text>
        <View style={styles.monthRow}>
          <Pressable onPress={() => setForm({ ...form, fromMonth: shiftMonth(form.fromMonth, -1) })} disabled={!!form.chargeId || form.fromMonth <= data.thisMonth}>
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18, opacity: form.fromMonth <= data.thisMonth ? 0.3 : 1 }}>‹</Text>
          </Pressable>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{form.fromMonth}</Text>
          <Pressable onPress={() => setForm({ ...form, fromMonth: shiftMonth(form.fromMonth, 1) })} disabled={!!form.chargeId}>
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text, flex: 1 }}>Include in GST (only if GST is on)</Text>
          <Switch value={form.gstApplicable} onValueChange={(v) => setForm({ ...form, gstApplicable: v })} />
        </View>
        <View style={styles.row}>
          <Pressable onPress={() => setForm(null)} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => void save()} disabled={busy} style={[styles.btn, styles.flex1, { backgroundColor: theme.accent }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  const active = data.charges.filter((c) => !c.ended);
  const ended = data.charges.filter((c) => c.ended);
  return (
    <View style={styles.gap}>
      <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18 }}>
        Optional. Charges are added to each unit’s monthly amount (dues, late fee, receipts and statements include them).
        A change applies from this month; earlier months keep their amount.
      </Text>
      {active.length === 0 ? <ListEmpty message="No charges. Members pay maintenance only." /> : null}
      {active.map((c) => (
        <View key={c.chargeId} style={[styles.card, { borderColor: theme.cardBorder }]}>
          <Text style={{ color: theme.text, fontWeight: '800' }}>{c.name}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            {c.description} · {TARGETS.find((t) => t.value === c.appliesTo)?.label}
            {c.gstApplicable ? ' · GST' : ''}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {c.running ? 'Running' : `Starts ${c.fromMonth}`}
            {c.untilMonth && c.kind === 'MONTHLY' ? ` · until ${c.untilMonth}` : ''}
          </Text>
          <View style={styles.actions}>
            {c.method === 'METERED' ? (
              <Pressable onPress={() => void openReadings(c, data.thisMonth)}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Readings</Text>
              </Pressable>
            ) : null}
            {data.canManage && c.kind === 'MONTHLY' ? (
              <Pressable
                onPress={() =>
                  setForm({
                    chargeId: c.chargeId,
                    name: c.name,
                    kind: c.kind,
                    method: c.method,
                    rate: String(c.rate),
                    twoWheelerRate: c.twoWheelerRate ? String(c.twoWheelerRate) : '',
                    appliesTo: c.appliesTo,
                    selected: c.selectedMemberIds,
                    fromMonth: c.fromMonth > data.thisMonth ? c.fromMonth : data.thisMonth,
                    gstApplicable: c.gstApplicable,
                  })
                }
              >
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Change</Text>
              </Pressable>
            ) : null}
            {data.canManage ? (
              <Pressable onPress={() => stop(c)}>
                <Text style={{ color: '#b91c1c', fontWeight: '700' }}>{c.fromMonth > data.thisMonth ? 'Delete' : 'End'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
      {ended.length > 0 ? (
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Ended: {ended.map((c) => `${c.name} (until ${c.untilMonth})`).join(', ')}
        </Text>
      ) : null}
      {data.canManage ? (
        <Pressable onPress={() => setForm(emptyForm(data.thisMonth))} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnText}>+ Add a charge</Text>
        </Pressable>
      ) : (
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>Only the chairman or treasurer can change charges.</Text>
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : 'transparent' }]}
    >
      <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function Hint({ text }: { text: string }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.textMuted, fontSize: 12 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 3 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  secondary: { flex: 1, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 8 },
});
