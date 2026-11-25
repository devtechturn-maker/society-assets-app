import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '../dashboard/SectionCard';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import {
  addAssetService,
  createAsset,
  fetchAsset,
  fetchAssets,
  removeAsset,
  updateAsset,
  type AssetInput,
  type AssetList,
  type AssetRow,
} from '../../services/officeV23';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { formatInr } from '../../utils/format';
import { DateField } from '../form/DateField';
import { missingMessage } from '../form/required';

const CATEGORIES = ['LIFT', 'PUMP', 'GENERATOR', 'CCTV', 'FIRE', 'ELECTRICAL', 'GYM', 'FURNITURE', 'OTHER'];
const label = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

type Screen = { name: 'list' } | { name: 'detail'; id: string } | { name: 'form'; asset?: AssetRow };

/** v23 asset register: lifts, pumps, generators… with AMC and service dates. Reminders 7 days before. */
export function AssetRegister() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  if (screen.name === 'form') {
    return <AssetForm asset={screen.asset} onDone={(id) => setScreen(id ? { name: 'detail', id } : { name: 'list' })} />;
  }
  if (screen.name === 'detail') {
    return <AssetDetail id={screen.id} onBack={() => setScreen({ name: 'list' })} onEdit={(a) => setScreen({ name: 'form', asset: a })} />;
  }
  return <AssetListView onOpen={(id) => setScreen({ name: 'detail', id })} onAdd={() => setScreen({ name: 'form' })} />;
}

function AssetListView({ onOpen, onAdd }: { onOpen: (id: string) => void; onAdd: () => void }) {
  const { theme } = useTheme();
  const [data, setData] = useState<AssetList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await fetchAssets());
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load assets'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <SectionCard
        title="Asset register"
        subtitle="The office gets a reminder 7 days before a service or AMC end date"
        headerRight={
          data?.canManage ? (
            <Pressable style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={onAdd}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          ) : undefined
        }
      >
        {error ? <ListError message={error} onRetry={() => void load()} /> : null}
        {!data && !error ? <ActivityIndicator color={theme.accent} /> : null}
        {data ? (
          <Text style={{ color: theme.textMuted, marginBottom: 6 }}>
            {data.items.length} assets · value {formatInr(Number(data.totalValue) || 0)}
            {data.dueSoon ? ` · ${data.dueSoon} need attention` : ''}
          </Text>
        ) : null}
        {data?.items.length === 0 ? <ListEmpty message="No assets yet. Add the lift, pumps, generator, CCTV…" /> : null}
        {data?.items.map((a) => (
          <Pressable key={a.id} onPress={() => onOpen(a.id)} style={[styles.row, { borderTopColor: theme.divider }]}>
            <Text style={[styles.name, { color: theme.text }]}>{a.name}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {label(a.category)}
              {a.location ? ` · ${a.location}` : ''}
              {a.nextServiceDate ? ` · next service ${a.nextServiceDate}` : ''}
            </Text>
            {a.alert ? <Text style={styles.alert}>⚠ {a.alert}</Text> : null}
          </Pressable>
        ))}
      </SectionCard>
    </ScrollView>
  );
}

function AssetDetail({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (a: AssetRow) => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [svc, setSvc] = useState({ serviceDate: '', cost: '', doneBy: '', notes: '' });
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    try {
      setAsset(await fetchAsset(id));
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    }
  }, [id, toast]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!asset) return <ActivityIndicator style={{ marginTop: 40 }} color={theme.accent} />;
  const input = [styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }];
  const line = (k: string, v?: string | number | null) =>
    v === null || v === undefined || v === '' ? null : (
      <Text style={{ color: theme.text, marginTop: 4 }}>
        <Text style={{ color: theme.textMuted }}>{k}: </Text>
        {String(v)}
      </Text>
    );

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={{ paddingVertical: 8 }}>
        <Text style={{ color: theme.accent, fontWeight: '800' }}>← All assets</Text>
      </Pressable>
      <SectionCard title={asset.name} subtitle={label(asset.category)}>
        {asset.alert ? <Text style={styles.alert}>⚠ {asset.alert}</Text> : null}
        {line('Location', asset.location)}
        {line('Bought', asset.purchaseDate)}
        {line('Value', asset.purchaseValue != null ? formatInr(Number(asset.purchaseValue)) : null)}
        {line('Vendor', asset.vendor)}
        {line('AMC company', asset.amcVendor)}
        {line('AMC ends', asset.amcEndDate)}
        {line('Service every', asset.serviceEveryDays ? `${asset.serviceEveryDays} days` : null)}
        {line('Next service', asset.nextServiceDate)}
        {line('Notes', asset.notes)}
        <View style={styles.two}>
          <Pressable onPress={() => onEdit(asset)} style={[styles.secondary, styles.flex, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              confirm({
                title: 'Remove asset?',
                message: 'It leaves the register. Its service history is kept.',
                confirmText: 'Remove',
                destructive: true,
                onConfirm: async () => {
                  try {
                    await removeAsset(asset.id);
                    onBack();
                  } catch (e) {
                    toast(apiErrorMessage(e), 'error');
                  }
                },
              })
            }
            style={[styles.secondary, styles.flex, { borderColor: '#b91c1c' }]}
          >
            <Text style={{ color: '#b91c1c', fontWeight: '800' }}>Remove</Text>
          </Pressable>
        </View>
      </SectionCard>
      <SectionCard title="Service history">
        {asset.services?.length ? null : <Text style={{ color: theme.textMuted }}>No service recorded yet.</Text>}
        {asset.services?.map((s) => (
          <View key={s.id} style={[styles.row, { borderTopColor: theme.divider }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {s.serviceDate}
              {s.cost != null ? ` · ${formatInr(Number(s.cost))}` : ''}
            </Text>
            {s.doneBy || s.notes ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{[s.doneBy, s.notes].filter(Boolean).join(' · ')}</Text> : null}
          </View>
        ))}
        {adding ? (
          <View style={{ marginTop: 8 }}>
            <DateField style={input} value={svc.serviceDate} onChangeText={(t) => setSvc({ ...svc, serviceDate: t })} placeholder="Date (blank = today)" placeholderTextColor={theme.placeholder} />
            <View style={styles.two}>
              <TextInput style={[input, styles.flex]} value={svc.cost} onChangeText={(t) => setSvc({ ...svc, cost: t })} keyboardType="decimal-pad" placeholder="Cost ₹" placeholderTextColor={theme.placeholder} />
              <TextInput style={[input, styles.flex]} value={svc.doneBy} onChangeText={(t) => setSvc({ ...svc, doneBy: t })} placeholder="Done by" placeholderTextColor={theme.placeholder} />
            </View>
            <TextInput style={[input, { marginTop: 8 }]} value={svc.notes} onChangeText={(t) => setSvc({ ...svc, notes: t })} placeholder="Notes" placeholderTextColor={theme.placeholder} />
            <Pressable
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  setAsset(await addAssetService(asset.id, svc));
                  setSvc({ serviceDate: '', cost: '', doneBy: '', notes: '' });
                  setAdding(false);
                  toast('Service recorded', 'success');
                } catch (e) {
                  toast(apiErrorMessage(e), 'error');
                } finally {
                  setBusy(false);
                }
              }}
              style={[styles.primary, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.primaryText}>Save service</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>+ Record a service</Text>
          </Pressable>
        )}
      </SectionCard>
    </ScrollView>
  );
}

function AssetForm({ asset, onDone }: { asset?: AssetRow; onDone: (id?: string) => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<Record<string, string>>({
    name: asset?.name ?? '',
    category: asset?.category ?? 'LIFT',
    location: asset?.location ?? '',
    purchaseDate: asset?.purchaseDate ?? '',
    purchaseValue: asset?.purchaseValue != null ? String(asset.purchaseValue) : '',
    vendor: asset?.vendor ?? '',
    amcVendor: asset?.amcVendor ?? '',
    amcEndDate: asset?.amcEndDate ?? '',
    serviceEveryDays: asset?.serviceEveryDays != null ? String(asset.serviceEveryDays) : '',
    nextServiceDate: asset?.nextServiceDate ?? '',
    notes: asset?.notes ?? '',
  });
  const input = [styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }];
  const DATE_KEYS = ['purchaseDate', 'amcEndDate', 'nextServiceDate'];
  const field = (key: string, title: string, placeholder?: string, numeric?: boolean) => (
    <>
      <Text style={[styles.label, { color: theme.text }]}>{title}</Text>
      {DATE_KEYS.includes(key) ? (
        <DateField style={input} value={f[key]} onChangeText={(t) => setF({ ...f, [key]: t })} placeholder="Select date" placeholderTextColor={theme.placeholder} />
      ) : (
      <TextInput
        style={input}
        value={f[key]}
        onChangeText={(t) => setF({ ...f, [key]: t })}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
      )}
    </>
  );

  async function save() {
    const problem = missingMessage([['Name', f.name]]);
    if (problem) return toast(problem, 'error');
    setSaving(true);
    try {
      const body = { ...f } as unknown as AssetInput;
      const saved = asset ? await updateAsset(asset.id, body) : await createAsset(body);
      toast(asset ? 'Asset updated' : 'Asset added', 'success');
      onDone(saved.id);
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onDone(asset?.id)} style={{ paddingVertical: 8 }}>
        <Text style={{ color: theme.accent, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <SectionCard title={asset ? 'Edit asset' : 'Add an asset'} subtitle="Tap a date to pick it from the calendar">
        {field('name', 'Name *', 'Lift – Wing A')}
        <Text style={[styles.label, { color: theme.text }]}>Type</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setF({ ...f, category: c })} style={[styles.chip, { borderColor: theme.accent, backgroundColor: f.category === c ? theme.accent : 'transparent' }]}>
              <Text style={{ color: f.category === c ? '#fff' : theme.accent, fontWeight: '700' }}>{label(c)}</Text>
            </Pressable>
          ))}
        </View>
        {field('location', 'Location', 'Wing A lobby')}
        {field('purchaseDate', 'Bought on', '2024-04-01')}
        {field('purchaseValue', 'Value ₹', '250000', true)}
        {field('vendor', 'Bought from')}
        {field('amcVendor', 'AMC company')}
        {field('amcEndDate', 'AMC ends on', '2027-03-31')}
        {field('serviceEveryDays', 'Service every (days)', '90', true)}
        {field('nextServiceDate', 'Next service on', '2026-12-15')}
        {field('notes', 'Notes')}
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.primary, { backgroundColor: theme.accent }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { color: '#fff', fontWeight: '800' },
  row: { borderTopWidth: 1, paddingVertical: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  alert: { color: '#b45309', fontWeight: '800', marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  primary: { marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 12 },
  two: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});
