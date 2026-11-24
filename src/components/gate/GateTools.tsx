import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addBlacklist,
  checkInByCode,
  closeSos,
  createStaffGatePass,
  fetchBlacklist,
  fetchHelperByCode,
  fetchHelpersInside,
  fetchOfficeHelpers,
  fetchSosAlerts,
  markHelperIn,
  markHelperOut,
  removeBlacklist,
  removeOfficeHelper,
  respondSos,
  searchGateVehicles,
} from '../../services/api';
import type { BlacklistEntry, DailyHelper, GateVehicle, HelperVisit, SosAlert } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { SectionCard } from '../dashboard/SectionCard';

const RED = '#dc2626';

function time(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function label(type?: string | null): string {
  if (!type) return '';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function useInput() {
  const { theme } = useTheme();
  return [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];
}

function Button({ title, onPress, busy, tone = 'accent', small }: { title: string; onPress: () => void; busy?: boolean; tone?: 'accent' | 'red' | 'plain'; small?: boolean }) {
  const { theme } = useTheme();
  const bg = tone === 'red' ? RED : tone === 'plain' ? theme.cardBg : theme.accent;
  const fg = tone === 'plain' ? theme.text : '#fff';
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        small ? styles.smallBtn : styles.btn,
        { backgroundColor: bg, borderColor: tone === 'plain' ? theme.cardBorder : bg, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

/**
 * v22 guard: one box for every 6-digit code. A daily-help pass shows the helper with In / Out;
 * any other code is tried as a guest or delivery pass and lets them in at once.
 */
export function GateCodeCard({ onDone }: { onDone?: () => void }) {
  const { theme } = useTheme();
  const { toast, alert } = useAppAlert();
  const inputStyle = useInput();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [helper, setHelper] = useState<DailyHelper | null>(null);
  const [inside, setInside] = useState<HelperVisit[]>([]);

  const loadInside = useCallback(async () => {
    setInside(await fetchHelpersInside().catch(() => [] as HelperVisit[]));
  }, []);

  useEffect(() => {
    void loadInside();
  }, [loadInside]);

  async function check() {
    Keyboard.dismiss();
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) return toast('Enter the 6-digit code', 'error');
    setBusy(true);
    setHelper(null);
    try {
      const h = await fetchHelperByCode(c).catch(() => null);
      if (h) {
        setHelper(h);
        return;
      }
      const v = await checkInByCode(c);
      alert('Let in', `${v.visitorName} for ${v.flatNumber}. The resident has been told.`, { variant: 'success' });
      setCode('');
      onDone?.();
    } catch (e) {
      toast(apiErrorMessage(e, 'Code not found'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function move(dir: 'in' | 'out') {
    setBusy(true);
    try {
      const c = code.replace(/\D/g, '');
      if (dir === 'in') await markHelperIn(c);
      else await markHelperOut(c);
      toast(`${helper?.name ?? 'Helper'} marked ${dir === 'in' ? 'in' : 'out'}`, 'success');
      setHelper(null);
      setCode('');
      await loadInside();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Enter a code" subtitle="Guest pass, expected delivery or daily-help pass (6 digits)">
      <View style={styles.row}>
        <TextInput
          style={[inputStyle, styles.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          placeholderTextColor={theme.placeholder}
          onSubmitEditing={() => void check()}
        />
        <Button title="Check" onPress={() => void check()} busy={busy && !helper} />
      </View>
      {helper ? (
        <View style={[styles.item, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>{helper.name}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {label(helper.workType)}
            {helper.flatNumber ? ` · Flat ${helper.flatNumber}` : ' · Society staff'}
            {helper.inside ? ' · Inside now' : ''}
          </Text>
          <View style={styles.row}>
            {helper.inside ? (
              <Button title="Mark out" onPress={() => void move('out')} busy={busy} />
            ) : (
              <Button title="Mark in" onPress={() => void move('in')} busy={busy} />
            )}
            <Button title="Cancel" tone="plain" onPress={() => setHelper(null)} />
          </View>
        </View>
      ) : null}
      {inside.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.subhead, { color: theme.text }]}>Daily help inside now ({inside.length})</Text>
          {inside.map((v) => (
            <Text key={v.id} style={[styles.meta, { color: theme.textMuted }]}>
              {v.name} · {label(v.workType)}
              {v.flatNumber ? ` · ${v.flatNumber}` : ''} · in {time(v.inTime)}
            </Text>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

/** v22 guard: find who owns a vehicle from part of its number plate. */
export function VehicleSearchCard() {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const inputStyle = useInput();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<GateVehicle[] | null>(null);

  async function search() {
    Keyboard.dismiss();
    if (q.replace(/[^a-z0-9]/gi, '').length < 3) return toast('Type at least 3 letters or numbers', 'error');
    setBusy(true);
    try {
      setRows(await searchGateVehicles(q));
    } catch (e) {
      toast(apiErrorMessage(e, 'Search failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Vehicle search" subtitle="Type part of the number plate, e.g. 1234">
      <View style={styles.row}>
        <TextInput
          style={[inputStyle, { flex: 1 }]}
          value={q}
          onChangeText={setQ}
          autoCapitalize="characters"
          placeholder="MH12AB1234"
          placeholderTextColor={theme.placeholder}
          onSubmitEditing={() => void search()}
        />
        <Button title="Search" onPress={() => void search()} busy={busy} />
      </View>
      {rows !== null && rows.length === 0 ? (
        <Text style={[styles.warn, { color: RED }]}>Not a society vehicle</Text>
      ) : null}
      {(rows ?? []).map((v) => (
        <View key={v.registrationNumber + v.flatNumber} style={[styles.item, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>{v.registrationNumber}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Flat {v.flatNumber} · {v.ownerName}
            {v.parkingSlot ? ` · Slot ${v.parkingSlot}` : ''}
          </Text>
          {v.makeModel || v.color ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>{[v.makeModel, v.color].filter(Boolean).join(' · ')}</Text>
          ) : null}
        </View>
      ))}
    </SectionCard>
  );
}

/** v22: SOS alerts. The gate sees open ones (checked every 20 s); the office sees the recent log. */
export function SosAlertsCard({ scope }: { scope: 'gate' | 'office' }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setAlerts(await fetchSosAlerts(scope).catch(() => [] as SosAlert[]));
  }, [scope]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  async function act(a: SosAlert, what: 'respond' | 'close') {
    setBusy(a.id);
    try {
      if (what === 'respond') await respondSos(scope, a.id);
      else await closeSos(scope, a.id);
      toast(what === 'respond' ? 'Marked as responding' : 'Alert closed', 'success');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not update'), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (scope === 'gate' && alerts.length === 0) return null;
  return (
    <SectionCard
      title={scope === 'gate' ? '🚨 SOS alerts' : 'SOS alerts'}
      subtitle={alerts.length === 0 ? 'No SOS alerts yet' : scope === 'gate' ? 'A resident needs help. Go now.' : 'Latest alerts from residents'}
    >
      {alerts.map((a) => (
        <View key={a.id} style={[styles.item, { borderColor: a.status === 'CLOSED' ? theme.cardBorder : RED }]}>
          <Text style={[styles.itemTitle, { color: a.status === 'CLOSED' ? theme.text : RED }]}>
            Flat {a.flatNumber} · {a.status === 'OPEN' ? 'Needs help' : a.status === 'RESPONDING' ? 'Responding' : 'Closed'}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {a.raisedByName ?? 'Resident'} · {time(a.createdAt)}
          </Text>
          {a.note ? <Text style={[styles.meta, { color: theme.text }]}>{a.note}</Text> : null}
          {a.respondedByName ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {a.respondedByName} responded {time(a.respondedAt)}
            </Text>
          ) : null}
          {a.status !== 'CLOSED' ? (
            <View style={styles.row}>
              {a.status === 'OPEN' ? <Button small tone="red" title="I'm going" busy={busy === a.id} onPress={() => void act(a, 'respond')} /> : null}
              <Button small tone="plain" title="Close" busy={busy === a.id} onPress={() => void act(a, 'close')} />
            </View>
          ) : null}
        </View>
      ))}
    </SectionCard>
  );
}

/** v22 office: people the gate must not let in. Only the chairman can remove someone. */
export function BlacklistSection({ canRemove }: { canRemove: boolean }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const inputStyle = useInput();
  const [rows, setRows] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchBlacklist());
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load the blacklist'), 'error');
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
    if (!digits && !name.trim()) return toast('Enter a mobile number or a name', 'error');
    if (digits && digits.length !== 10) return toast('Enter a 10-digit mobile number', 'error');
    if (!reason.trim()) return toast('Enter the reason', 'error');
    setSaving(true);
    try {
      await addBlacklist({ mobileNumber: digits || undefined, name: name.trim() || undefined, reason: reason.trim() });
      setMobile('');
      setName('');
      setReason('');
      toast('Added. The gate will block this mobile number.', 'success');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not add'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <SectionCard title="Add to blacklist" subtitle="The guard cannot register this mobile number. Residents do not see this list.">
        <TextInput style={inputStyle} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={14} placeholder="Mobile number" placeholderTextColor={theme.placeholder} />
        <TextInput style={[inputStyle, styles.gap]} value={name} onChangeText={setName} placeholder="Name (optional)" placeholderTextColor={theme.placeholder} />
        <TextInput style={[inputStyle, styles.gap]} value={reason} onChangeText={setReason} placeholder="Reason" placeholderTextColor={theme.placeholder} maxLength={300} />
        <View style={styles.gap}>
          <Button title="Add to blacklist" tone="red" onPress={() => void add()} busy={saving} />
        </View>
      </SectionCard>
      <SectionCard title="Blacklist" subtitle={loading ? 'Loading…' : rows.length === 0 ? 'Nobody is blacklisted' : `${rows.length} blocked`}>
        {rows.map((r) => (
          <View key={r.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>{[r.name, r.mobileNumber].filter(Boolean).join(' · ')}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>{r.reason}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Added {time(r.createdAt)}
              {r.addedByName ? ` by ${r.addedByName}` : ''}
            </Text>
            {canRemove ? (
              <View style={styles.row}>
                <Button
                  small
                  tone="plain"
                  title="Remove"
                  onPress={() =>
                    confirm({
                      title: 'Remove from blacklist?',
                      message: 'The gate will be able to let this person in again.',
                      confirmText: 'Remove',
                      destructive: true,
                      onConfirm: async () => {
                        try {
                          await removeBlacklist(r.id);
                          await load();
                        } catch (e) {
                          toast(apiErrorMessage(e, 'Could not remove'), 'error');
                        }
                      },
                    })
                  }
                />
              </View>
            ) : null}
          </View>
        ))}
      </SectionCard>
    </View>
  );
}

/** v22 office: every gate pass in the society (residents' helpers and staff). */
export function OfficeDailyHelpSection() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [rows, setRows] = useState<DailyHelper[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await fetchOfficeHelpers());
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SectionCard
      title="Daily help passes"
      subtitle={loading ? 'Loading…' : rows.length === 0 ? 'No passes yet. Residents add their help in Visitors → Daily help; staff passes are in Staff.' : `${rows.length} active passes`}
    >
      {rows.map((h) => (
        <View key={h.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>
            {h.name} · {label(h.workType)}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {h.flatNumber ? `Flat ${h.flatNumber}` : 'Society staff'} · Code {h.passCode}
            {h.mobileNumber ? ` · ${h.mobileNumber}` : ''}
          </Text>
          <View style={styles.row}>
            <Button
              small
              tone="plain"
              title="Stop pass"
              onPress={() =>
                confirm({
                  title: `Stop ${h.name}'s pass?`,
                  message: 'The code will stop working at the gate.',
                  confirmText: 'Stop pass',
                  destructive: true,
                  onConfirm: async () => {
                    try {
                      await removeOfficeHelper(h.id);
                      await load();
                    } catch (e) {
                      toast(apiErrorMessage(e, 'Could not stop the pass'), 'error');
                    }
                  },
                })
              }
            />
          </View>
        </View>
      ))}
    </SectionCard>
  );
}

/** v22 office: give a society staff member a gate pass; their gate In marks them Present. */
export function StaffGatePassButton({ staffId }: { staffId: string }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [pass, setPass] = useState<DailyHelper | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ marginTop: 10 }}>
      {pass ? (
        <Text style={[styles.itemTitle, { color: theme.accent }]}>Gate pass code {pass.passCode}</Text>
      ) : (
        <Button
          tone="plain"
          title="Gate pass code"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              setPass(await createStaffGatePass(staffId));
            } catch (e) {
              toast(apiErrorMessage(e, 'Could not make the pass'), 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      <Text style={[styles.meta, { color: theme.textMuted, marginTop: 4 }]}>
        The guard enters this code at the gate. Gate In marks the staff member Present.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  codeInput: { flex: 1, fontSize: 22, letterSpacing: 6, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  gap: { marginTop: 8 },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 90 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnText: { fontWeight: '800', fontSize: 14 },
  item: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 13 },
  subhead: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  warn: { marginTop: 8, fontWeight: '800' },
});
