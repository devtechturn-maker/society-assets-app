import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import {
  createStaff,
  fetchDaySheet,
  fetchMonthReport,
  fetchSalary,
  fetchSalaryHistory,
  fetchSalaryPolicy,
  fetchStaff,
  fetchStaffMember,
  recordSalary,
  saveDaySheet,
  saveSalaryPolicy,
  setStaffActive,
  updateStaff,
  type AttendanceStatus,
  type DaySheet,
  type MonthReportRow,
  type SalaryBreakdown,
  type SalaryPayment,
  type SalaryPolicy,
  type Staff,
  type StaffInput,
} from '../../services/staff';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

type Tab = 'staff' | 'attendance' | 'salary' | 'policy';
const DESIGNATIONS = ['Security Guard', 'Housekeeping', 'Gardener', 'Maintenance Worker', 'Lift Operator', 'Other'];
const STATUS_OPTIONS: { key: AttendanceStatus; short: string; color: string }[] = [
  { key: 'PRESENT', short: 'P', color: '#047857' },
  { key: 'ABSENT', short: 'A', color: '#b91c1c' },
  { key: 'HALF_DAY', short: '½', color: '#b45309' },
  { key: 'LEAVE', short: 'L', color: '#7c3aed' },
  { key: 'WEEKLY_OFF', short: 'Off', color: '#475569' },
  { key: 'HOLIDAY', short: 'Hol', color: '#0369a1' },
];
const METHODS = [
  { key: 'BANK_TRANSFER', label: 'Bank transfer' },
  { key: 'UPI', label: 'UPI' },
  { key: 'CASH', label: 'Cash' },
  { key: 'CHEQUE', label: 'Cheque' },
];

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoMonth = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const shiftDay = (iso: string, by: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + by));
};
const shiftMonth = (iso: string, by: number) => {
  const [y, m] = iso.split('-').map(Number);
  return isoMonth(new Date(y, m - 1 + by, 1));
};
const monthLabel = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/** Society staff: records, daily attendance, monthly salary from attendance, and the salary rules. */
export function StaffModule({ userRole }: { userRole?: string | null }) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>('attendance');
  const canPay = ['CHAIRMAN', 'TREASURER'].includes((userRole ?? '').toUpperCase());
  const tabs: { key: Tab; label: string }[] = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'salary', label: 'Salary' },
    { key: 'staff', label: 'Staff' },
    { key: 'policy', label: 'Rules' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.tabs, { borderColor: theme.cardBorder }]}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && { borderBottomColor: theme.accent }]}>
            <Text style={{ color: tab === t.key ? theme.accent : theme.textMuted, fontWeight: '800' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'staff' ? <StaffTab /> : null}
      {tab === 'attendance' ? <AttendanceTab /> : null}
      {tab === 'salary' ? <SalaryTab canPay={canPay} /> : null}
      {tab === 'policy' ? <PolicyTab canEdit={canPay} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------- staff list / form / profile

function StaffTab() {
  const { theme } = useTheme();
  const [list, setList] = useState<Staff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Staff | 'new' | null>(null);
  const [profile, setProfile] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await fetchStaff());
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load staff'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (editing) {
    return <StaffForm staff={editing === 'new' ? undefined : editing} onDone={() => { setEditing(null); void load(); }} />;
  }
  if (profile) {
    return <StaffProfile id={profile} onBack={() => { setProfile(null); void load(); }} onEdit={(s) => setEditing(s)} />;
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => setEditing('new')} style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1, marginTop: 0 }]}>
        <Text style={styles.primaryText}>Add staff member</Text>
      </Pressable>
      {error ? <ListError message={error} onRetry={() => void load()} /> : null}
      {list === null && !error ? <ActivityIndicator color={theme.accent} style={{ marginTop: 16 }} /> : null}
      {list?.length === 0 ? <ListEmpty message="No staff yet. Add your guards, housekeeping and other staff." /> : null}
      {list?.map((s) => (
        <Pressable key={s.id} onPress={() => setProfile(s.id)} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: s.status === 'INACTIVE' ? 0.6 : 1 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{s.name}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {s.designation} · {inr(s.payRate)} {s.payType === 'MONTHLY' ? 'per month' : 'per day'}
            </Text>
          </View>
          <Text style={[styles.badge, { color: s.status === 'ACTIVE' ? '#047857' : '#475569', borderColor: s.status === 'ACTIVE' ? '#047857' : '#475569' }]}>
            {s.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function StaffForm({ staff, onDone }: { staff?: Staff; onDone: () => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [f, setF] = useState<StaffInput>({
    name: staff?.name ?? '',
    designation: staff?.designation ?? 'Security Guard',
    phone: staff?.phone ?? '',
    joiningDate: staff?.joiningDate ?? isoDay(new Date()),
    payType: staff?.payType ?? 'MONTHLY',
    payRate: staff ? String(staff.payRate) : '',
    upiId: staff?.upiId ?? '',
    bankAccount: staff?.bankAccountMasked ?? '',
    bankIfsc: staff?.bankIfsc ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof StaffInput) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  async function save() {
    setSaving(true);
    try {
      if (staff) await updateStaff(staff.id, f);
      else await createStaff(f);
      toast(staff ? 'Staff updated' : 'Staff added', 'success');
      onDone();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionCard title={staff ? 'Edit staff' : 'Add staff'} subtitle="Staff do not get an app login">
        <Text style={[styles.label, { color: theme.text }]}>Name</Text>
        <TextInput style={input} value={f.name} onChangeText={set('name')} placeholder="Rajesh Kumar" placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Role</Text>
        <View style={styles.chips}>
          {DESIGNATIONS.map((d) => (
            <Chip key={d} label={d} selected={f.designation === d} onPress={() => set('designation')(d)} />
          ))}
        </View>
        {!DESIGNATIONS.includes(f.designation) || f.designation === 'Other' ? (
          <TextInput style={input} value={f.designation === 'Other' ? '' : f.designation} onChangeText={set('designation')} placeholder="Type the role" placeholderTextColor={theme.placeholder} />
        ) : null}
        <Text style={[styles.label, { color: theme.text }]}>Mobile (optional)</Text>
        <TextInput style={input} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Joining date (YYYY-MM-DD)</Text>
        <TextInput style={input} value={f.joiningDate} onChangeText={set('joiningDate')} placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Pay</Text>
        <View style={styles.chips}>
          <Chip label="Monthly salary" selected={f.payType === 'MONTHLY'} onPress={() => setF((x) => ({ ...x, payType: 'MONTHLY' }))} />
          <Chip label="Daily wage" selected={f.payType === 'DAILY'} onPress={() => setF((x) => ({ ...x, payType: 'DAILY' }))} />
        </View>
        <TextInput style={input} value={f.payRate} onChangeText={set('payRate')} keyboardType="decimal-pad" placeholder={f.payType === 'MONTHLY' ? 'Salary per month (₹)' : 'Wage per day (₹)'} placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Payment details (optional, office only)</Text>
        <TextInput style={input} value={f.upiId} onChangeText={set('upiId')} autoCapitalize="none" placeholder="UPI id" placeholderTextColor={theme.placeholder} />
        <View style={[styles.two, { marginTop: 8 }]}>
          <TextInput style={[input, { flex: 1 }]} value={f.bankAccount} onChangeText={set('bankAccount')} keyboardType="number-pad" placeholder="Bank account no." placeholderTextColor={theme.placeholder} />
          <TextInput style={[input, { flex: 1 }]} value={f.bankIfsc} onChangeText={set('bankIfsc')} autoCapitalize="characters" placeholder="IFSC" placeholderTextColor={theme.placeholder} />
        </View>
        <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.9 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
        </Pressable>
        <Pressable onPress={onDone} style={styles.cancel}>
          <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

function StaffProfile({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (s: Staff) => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [s, setS] = useState<Staff | null>(null);
  const load = useCallback(async () => {
    try {
      setS(await fetchStaffMember(id));
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    }
  }, [id, toast]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!s) return <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>All staff</Text>
      </Pressable>
      <SectionCard title={s.name} subtitle={s.designation}>
        <Text style={[styles.body, { color: theme.text }]}>{inr(s.payRate)} {s.payType === 'MONTHLY' ? 'per month' : 'per day'}</Text>
        {s.phone ? <Text style={[styles.meta, { color: theme.textMuted }]}>Mobile {s.phone}</Text> : null}
        {s.joiningDate ? <Text style={[styles.meta, { color: theme.textMuted }]}>Joined {s.joiningDate}</Text> : null}
        {s.upiId ? <Text style={[styles.meta, { color: theme.textMuted }]}>UPI {s.upiId}</Text> : null}
        {s.bankAccountMasked ? <Text style={[styles.meta, { color: theme.textMuted }]}>Bank {s.bankAccountMasked} · {s.bankIfsc}</Text> : null}
        <View style={[styles.two, { marginTop: 12 }]}>
          <Pressable onPress={() => onEdit(s)} style={[styles.secondary, { borderColor: theme.accent, flex: 1 }]}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              try {
                setS(await setStaffActive(s.id, s.status !== 'ACTIVE'));
              } catch (e) {
                toast(apiErrorMessage(e), 'error');
              }
            }}
            style={[styles.secondary, { borderColor: theme.cardBorder, flex: 1 }]}
          >
            <Text style={{ color: theme.text, fontWeight: '700' }}>{s.status === 'ACTIVE' ? 'Mark inactive' : 'Re-activate'}</Text>
          </Pressable>
        </View>
      </SectionCard>
      <SectionCard title="Salary history">
        {!s.salaries?.length ? <Text style={[styles.meta, { color: theme.textMuted }]}>No salary recorded yet.</Text> : null}
        {s.salaries?.map((p) => <PaymentLine key={p.id} p={p} />)}
      </SectionCard>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- attendance

function AttendanceTab() {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [view, setView] = useState<'day' | 'month'>('day');
  const [date, setDate] = useState(isoDay(new Date()));
  const [month, setMonth] = useState(isoMonth(new Date()));
  const [sheet, setSheet] = useState<DaySheet | null>(null);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [report, setReport] = useState<MonthReportRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = isoDay(new Date());

  const loadDay = useCallback(async () => {
    setError(null);
    try {
      const s = await fetchDaySheet(date);
      setSheet(s);
      const d: Record<string, AttendanceStatus> = {};
      s.staff.forEach((r) => {
        if (r.status) d[r.staffId] = r.status;
        else if (s.weeklyOff) d[r.staffId] = 'WEEKLY_OFF';
      });
      setDraft(d);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load attendance'));
    }
  }, [date]);

  useEffect(() => {
    if (view === 'day') void loadDay();
  }, [view, loadDay]);
  useEffect(() => {
    if (view === 'month') fetchMonthReport(month).then((r) => setReport(r.staff)).catch((e) => setError(apiErrorMessage(e)));
  }, [view, month]);

  async function save() {
    const entries = Object.entries(draft).map(([staffId, status]) => ({ staffId, status }));
    if (!entries.length) return toast('Mark at least one staff member', 'error');
    setSaving(true);
    try {
      const r = await saveDaySheet(date, entries);
      toast(r.corrected ? `Saved. ${r.corrected} correction(s) recorded.` : 'Attendance saved', 'success');
      await loadDay();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.chips}>
        <Chip label="Daily" selected={view === 'day'} onPress={() => setView('day')} />
        <Chip label="Monthly report" selected={view === 'month'} onPress={() => setView('month')} />
      </View>
      {error ? <ListError message={error} /> : null}
      {view === 'day' ? (
        <>
          <Stepper label={dayLabel(date)} onPrev={() => setDate((d) => shiftDay(d, -1))} onNext={date < today ? () => setDate((d) => shiftDay(d, 1)) : undefined} />
          {sheet?.weeklyOff ? <Text style={[styles.meta, { color: theme.textMuted, marginBottom: 6 }]}>Weekly off day. Change anyone who worked.</Text> : null}
          {sheet === null ? <ActivityIndicator color={theme.accent} /> : null}
          {sheet?.staff.length === 0 ? <ListEmpty message="No active staff. Add staff in the Staff tab." /> : null}
          {sheet?.staff.map((r) => (
            <View key={r.staffId} style={[styles.attRow, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowTitle, { color: theme.text, fontSize: 14 }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{r.designation}{r.status ? '' : ' · not marked'}</Text>
              </View>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((o) => {
                  const sel = draft[r.staffId] === o.key;
                  return (
                    <Pressable
                      key={o.key}
                      disabled={!sheet.canEdit}
                      accessibilityLabel={`${r.name} ${o.key}`}
                      onPress={() => setDraft((d) => ({ ...d, [r.staffId]: o.key }))}
                      style={[styles.statusBtn, { borderColor: o.color, backgroundColor: sel ? o.color : 'transparent' }]}
                    >
                      <Text style={{ color: sel ? '#fff' : o.color, fontWeight: '800', fontSize: 12 }}>{o.short}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Text style={[styles.meta, { color: theme.textMuted }]}>P present · A absent · ½ half-day · L leave · Off weekly off · Hol holiday</Text>
          {sheet?.canEdit && sheet.staff.length ? (
            <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.9 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save attendance</Text>}
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <Stepper label={monthLabel(month)} onPrev={() => setMonth((m) => shiftMonth(m, -1))} onNext={month < isoMonth(new Date()) ? () => setMonth((m) => shiftMonth(m, 1)) : undefined} />
          {report === null ? <ActivityIndicator color={theme.accent} /> : null}
          {report?.length === 0 ? <ListEmpty message="No attendance for this month." /> : null}
          {report?.map((r) => (
            <View key={r.staffId} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{r.name}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  Present {r.present} · Absent {r.absent} · Half {r.halfDays} · Leave {r.leave} · Off {r.weeklyOff} · Hol {r.holidays}
                  {r.unmarked ? ` · Not marked ${r.unmarked}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- salary

function SalaryTab({ canPay }: { canPay: boolean }) {
  const { theme } = useTheme();
  const [month, setMonth] = useState(shiftMonth(isoMonth(new Date()), -1));
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [paid, setPaid] = useState<SalaryPayment[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, h] = await Promise.all([fetchStaff(), fetchSalaryHistory(month)]);
    setStaff(s.filter((x) => x.status === 'ACTIVE' || h.some((p) => p.staffId === x.id)));
    setPaid(h);
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);

  if (open) {
    return <SalaryReview staffId={open} month={month} canPay={canPay} onBack={() => { setOpen(null); void load(); }} />;
  }
  const total = paid.reduce((a, p) => a + p.netAmount, 0);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stepper label={monthLabel(month)} onPrev={() => setMonth((m) => shiftMonth(m, -1))} onNext={month < isoMonth(new Date()) ? () => setMonth((m) => shiftMonth(m, 1)) : undefined} />
      <Text style={[styles.meta, { color: theme.textMuted, marginBottom: 8 }]}>
        {paid.length} paid · {inr(total)} · pay outside the app (bank, UPI, cash) and record it here
      </Text>
      {staff === null ? <ActivityIndicator color={theme.accent} /> : null}
      {staff?.length === 0 ? <ListEmpty message="No staff yet." /> : null}
      {staff?.map((s) => {
        const p = paid.find((x) => x.staffId === s.id);
        return (
          <Pressable key={s.id} onPress={() => setOpen(s.id)} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{s.name}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>{s.designation}{p ? ` · ${inr(p.netAmount)} paid ${p.paidOn}` : ''}</Text>
            </View>
            <Text style={[styles.badge, { color: p ? '#047857' : '#b45309', borderColor: p ? '#047857' : '#b45309' }]}>{p ? 'Paid' : 'Not paid'}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SalaryReview({ staffId, month, canPay, onBack }: { staffId: string; month: string; canPay: boolean; onBack: () => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [b, setB] = useState<SalaryBreakdown | null>(null);
  const [allowances, setAllowances] = useState('');
  const [deductions, setDeductions] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  const load = useCallback(async () => {
    try {
      setB(await fetchSalary(staffId, month, Number(allowances) || 0, Number(deductions) || 0));
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    }
  }, [staffId, month, allowances, deductions, toast]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function record() {
    if (!b) return;
    setSaving(true);
    try {
      await recordSalary(staffId, {
        month,
        confirmedAmount: b.netAmount,
        allowances: Number(allowances) || 0,
        otherDeductions: Number(deductions) || 0,
        paymentMethod: method,
        paymentReference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast('Salary recorded. Expense added and members notified.', 'success');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not record'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!b) return <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />;
  const line = (label: string, value: string, strong = false) => (
    <View style={styles.line} key={label}>
      <Text style={{ color: strong ? theme.text : theme.textMuted, fontWeight: strong ? '800' : '500', flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: strong ? '800' : '700' }}>{value}</Text>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>All staff</Text>
      </Pressable>
      <SectionCard title={`${b.name} · ${monthLabel(month)}`} subtitle={b.designation}>
        {line(b.payType === 'MONTHLY' ? 'Monthly salary' : 'Daily wage', inr(b.payRate))}
        {b.payType === 'MONTHLY' ? line(`Working days (${b.workingDays}) · per day`, inr(b.dailyRate)) : null}
        {line('Present', String(b.presentDays))}
        {line('Absent', String(b.absentDays))}
        {line('Half-days', String(b.halfDays))}
        {line(`Leave (${b.paidLeaveDays} paid, ${b.unpaidLeaveDays} unpaid)`, String(b.leaveDays))}
        {line('Weekly off / holidays (paid)', `${b.weeklyOffDays} / ${b.holidayDays}`)}
        {b.unmarkedDays ? line('Not marked', String(b.unmarkedDays)) : null}
        {b.daysBeforeJoining ? line('Days before joining', String(b.daysBeforeJoining)) : null}
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        {line(b.payType === 'MONTHLY' ? 'Base salary' : 'Earned (days worked)', inr(b.baseAmount))}
        {b.attendanceDeduction ? line('Attendance deduction', `− ${inr(b.attendanceDeduction)}`) : null}
        {b.allowances ? line('Allowances', `+ ${inr(b.allowances)}`) : null}
        {b.otherDeductions ? line('Other deductions', `− ${inr(b.otherDeductions)}`) : null}
        {line('Payable', inr(b.netAmount), true)}
        {b.unmarkedDays && !b.payment ? (
          <Text style={[styles.warn]}>{b.unmarkedDays} day(s) have no attendance. Mark them before paying if needed.</Text>
        ) : null}
        {!b.monthComplete && !b.payment ? <Text style={styles.warn}>This month is not over yet.</Text> : null}
      </SectionCard>

      {b.payment ? (
        <SectionCard title="Paid" subtitle={`Recorded by ${b.payment.recordedByName}`}>
          <PaymentLine p={b.payment} />
        </SectionCard>
      ) : canPay ? (
        <SectionCard title="Record payment" subtitle="Pay the staff member first, then record it. This adds a SALARY expense and notifies members.">
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>Allowances (₹)</Text>
              <TextInput style={input} value={allowances} onChangeText={setAllowances} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.placeholder} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>Other deductions (₹)</Text>
              <TextInput style={input} value={deductions} onChangeText={setDeductions} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.placeholder} />
            </View>
          </View>
          <Text style={[styles.label, { color: theme.text }]}>Paid by</Text>
          <View style={styles.chips}>
            {METHODS.map((m) => <Chip key={m.key} label={m.label} selected={method === m.key} onPress={() => setMethod(m.key)} />)}
          </View>
          {method !== 'CASH' ? (
            <TextInput style={input} value={reference} onChangeText={setReference} placeholder={method === 'CHEQUE' ? 'Cheque number' : 'UTR / transaction id'} placeholderTextColor={theme.placeholder} />
          ) : null}
          <TextInput style={[input, { marginTop: 8 }]} value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={theme.placeholder} />
          <Pressable
            disabled={saving || b.netAmount <= 0}
            onPress={() =>
              confirm({
                title: `Record ${inr(b.netAmount)}?`,
                message: `${b.name}, ${monthLabel(month)}. Recorded as paid; a SALARY expense is added and members are notified. It cannot be recorded twice.`,
                confirmText: 'Record payment',
                onConfirm: () => record(),
              })
            }
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving || b.netAmount <= 0 ? 0.5 : pressed ? 0.9 : 1 }]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm and record {inr(b.netAmount)}</Text>}
          </Pressable>
        </SectionCard>
      ) : (
        <Text style={[styles.meta, { color: theme.textMuted }]}>Only the chairman or treasurer can record salary payments.</Text>
      )}
    </ScrollView>
  );
}

function PaymentLine({ p }: { p: SalaryPayment }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.rowTitle, { color: theme.text, fontSize: 14 }]}>{monthLabel(p.month)} · {inr(p.netAmount)}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        Paid {p.paidOn} by {p.paymentMethod.replace('_', ' ').toLowerCase()}{p.paymentReference ? ` · ref ${p.paymentReference}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        Base {inr(p.baseAmount)}{p.attendanceDeduction ? ` − ${inr(p.attendanceDeduction)} attendance` : ''}{p.allowances ? ` + ${inr(p.allowances)}` : ''}{p.otherDeductions ? ` − ${inr(p.otherDeductions)}` : ''}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- policy

function PolicyTab({ canEdit }: { canEdit: boolean }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [p, setP] = useState<SalaryPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchSalaryPolicy().then(setP).catch((e) => toast(apiErrorMessage(e), 'error'));
  }, [toast]);
  if (!p) return <ActivityIndicator color={'#888'} style={{ marginTop: 24 }} />;
  const days = ['NONE', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Salary rules" subtitle="Used for every salary calculation. Recorded salaries keep the amount they were paid.">
        <Text style={[styles.label, { color: theme.text }]}>Weekly off day (paid)</Text>
        <View style={styles.chips}>
          {days.map((d) => (
            <Chip key={d} label={d === 'NONE' ? 'None' : d.slice(0, 3)} selected={p.weeklyOffDay === d} onPress={() => canEdit && setP({ ...p, weeklyOffDay: d })} />
          ))}
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Paid leave days per month</Text>
        <TextInput editable={canEdit} style={input} value={String(p.paidLeaveDays)} onChangeText={(v) => setP({ ...p, paidLeaveDays: Number(v.replace(/\D/g, '')) || 0 })} keyboardType="number-pad" />
        <Text style={[styles.label, { color: theme.text }]}>Half-day deducts</Text>
        <View style={styles.chips}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Chip key={v} label={v === 0 ? 'Nothing' : v === 1 ? 'Full day' : `${v * 100}% of a day`} selected={p.halfDayDeduction === v} onPress={() => canEdit && setP({ ...p, halfDayDeduction: v })} />
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text, flex: 1 }}>Holidays are paid</Text>
          <Switch disabled={!canEdit} value={p.holidaysPaid} onValueChange={(v) => setP({ ...p, holidaysPaid: v })} />
        </View>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text, flex: 1 }}>Deduct days with no attendance marked</Text>
          <Switch disabled={!canEdit} value={p.deductUnmarkedDays} onValueChange={(v) => setP({ ...p, deductUnmarkedDays: v })} />
        </View>
        <Text style={[styles.meta, { color: theme.textMuted, marginTop: 8 }]}>
          Monthly salary ÷ working days (days in the month minus the weekly off) = one day&apos;s pay. Absent days and leave beyond the paid limit are deducted. Daily-wage staff are paid for days worked.
        </Text>
        {canEdit ? (
          <Pressable
            disabled={saving}
            onPress={async () => {
              setSaving(true);
              try {
                setP(await saveSalaryPolicy(p));
                toast('Salary rules saved', 'success');
              } catch (e) {
                toast(apiErrorMessage(e), 'error');
              } finally {
                setSaving(false);
              }
            }}
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.primaryText}>Save rules</Text>
          </Pressable>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Only the chairman or treasurer can change these rules.</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- small pieces

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: selected ? theme.accent : theme.cardBorder, backgroundColor: selected ? theme.accent : theme.cardBg }]}>
      <Text style={{ color: selected ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onPrev} hitSlop={10} accessibilityLabel="Previous">
        <Ionicons name="chevron-back" size={22} color={theme.accent} />
      </Pressable>
      <Text style={[styles.rowTitle, { color: theme.text }]}>{label}</Text>
      <Pressable onPress={onNext} disabled={!onNext} hitSlop={10} accessibilityLabel="Next">
        <Ionicons name="chevron-forward" size={22} color={onNext ? theme.accent : theme.cardBorder} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  content: { padding: 12, paddingBottom: 40, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8 },
  attRow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 8 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBtn: { borderWidth: 1.5, borderRadius: 10, minWidth: 40, paddingVertical: 7, paddingHorizontal: 6, alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  body: { fontSize: 15, fontWeight: '700' },
  badge: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  two: { flexDirection: 'row', gap: 10 },
  primary: { marginTop: 14, borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  divider: { height: 1, marginVertical: 8 },
  warn: { color: '#b45309', fontWeight: '700', fontSize: 12, marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
});
