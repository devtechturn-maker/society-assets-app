import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { SectionCard } from '../dashboard/SectionCard';
import { ListLoading } from '../dashboard/ListStates';
import { fetchMembers, sendReportsEmail } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyMember } from '../../types/api';

export function ReportEmailForm() {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const members = useAsyncLoad(fetchMembers, []);
  const [sending, setSending] = useState(false);

  const [sendToAllMembers, setSendToAllMembers] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState('');
  const [includeAllReports, setIncludeAllReports] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMonthlyMaintenance, setIncludeMonthlyMaintenance] = useState(true);
  const [includeExpenseCategories, setIncludeExpenseCategories] = useState(true);
  const [includePaymentModes, setIncludePaymentModes] = useState(true);
  const [includeMemberPending, setIncludeMemberPending] = useState(true);

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleIncludeAllReportsChange(next: boolean) {
    setIncludeAllReports(next);
    if (next) {
      setIncludeSummary(true);
      setIncludeMonthlyMaintenance(true);
      setIncludeExpenseCategories(true);
      setIncludePaymentModes(true);
      setIncludeMemberPending(true);
    }
  }

  function setIndividualReport(setter: (v: boolean) => void, next: boolean) {
    setter(next);
    if (!next) {
      setIncludeAllReports(false);
    }
  }

  async function submit() {
    const emails = customEmails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (!sendToAllMembers && memberIds.length === 0 && emails.length === 0) {
      alert('Recipients required', 'Select members, enable all members, or add custom emails.', {
        variant: 'error',
      });
      return;
    }

    const reportTypes: string[] = [];
    if (!includeAllReports) {
      if (includeSummary) reportTypes.push('SUMMARY');
      if (includeMonthlyMaintenance) reportTypes.push('MONTHLY_MAINTENANCE');
      if (includeExpenseCategories) reportTypes.push('EXPENSE_CATEGORIES');
      if (includePaymentModes) reportTypes.push('PAYMENT_MODES');
      if (includeMemberPending) reportTypes.push('MEMBER_PENDING');
      if (reportTypes.length === 0) {
        alert('Reports required', 'Select at least one report type or enable Include all reports.', {
          variant: 'error',
        });
        return;
      }
    }

    setSending(true);
    try {
      const result = await sendReportsEmail({
        sendToAllMembers,
        memberIds,
        customEmails: emails,
        includeAllReports,
        reportTypes,
      });
      alert(
        'Reports sent',
        `Delivered to ${result.sentCount} recipient(s) · ${result.reportCount} report(s) attached.`,
        { variant: 'success' }
      );
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Send failed', msg ?? (e instanceof Error ? e.message : 'Unable to send reports'), {
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <SectionCard
      title="Email Reports (PDF Attachments)"
      subtitle="Send selected or all reports to members and/or custom emails"
    >
      <CheckboxRow
        label="Send to all registered members"
        checked={sendToAllMembers}
        onChange={setSendToAllMembers}
      />

      {!sendToAllMembers ? (
        <View style={styles.block}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Send to selected members</Text>
          {members.loading ? <ListLoading /> : null}
          {(members.data ?? []).map((m) => (
            <MemberPick key={m.id} member={m} selected={memberIds.includes(m.id)} onToggle={() => toggleMember(m.id)} />
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Custom emails (comma separated)</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText,
            },
          ]}
          placeholder="audit1@example.com, audit2@example.com"
          placeholderTextColor={theme.placeholder}
          value={customEmails}
          onChangeText={setCustomEmails}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Reports to include</Text>

      <View style={[styles.reportPanel, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
        <CheckboxRow
          label="Include all reports"
          checked={includeAllReports}
          onChange={handleIncludeAllReportsChange}
        />

        <View style={[styles.panelDivider, { backgroundColor: theme.divider }]} />

        <View style={styles.reportGrid}>
          <View style={styles.reportCol}>
            <CheckboxRow
              label="Monthly Maintenance"
              checked={includeMonthlyMaintenance}
              onChange={(v) => setIndividualReport(setIncludeMonthlyMaintenance, v)}
              compact
            />
            <CheckboxRow
              label="Payment Modes"
              checked={includePaymentModes}
              onChange={(v) => setIndividualReport(setIncludePaymentModes, v)}
              compact
            />
          </View>
          <View style={styles.reportCol}>
            <CheckboxRow
              label="Summary"
              checked={includeSummary}
              onChange={(v) => setIndividualReport(setIncludeSummary, v)}
              compact
            />
            <CheckboxRow
              label="Expense Categories"
              checked={includeExpenseCategories}
              onChange={(v) => setIndividualReport(setIncludeExpenseCategories, v)}
              compact
            />
            <CheckboxRow
              label="Member Pending"
              checked={includeMemberPending}
              onChange={(v) => setIndividualReport(setIncludeMemberPending, v)}
              compact
            />
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.submit, { backgroundColor: theme.accent }, sending ? styles.disabled : null]}
        onPress={submit}
        disabled={sending}
      >
        <Text style={styles.submitText}>{sending ? 'Sending…' : 'Send Report Emails'}</Text>
      </Pressable>
    </SectionCard>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  compact,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[styles.checkboxRow, compact ? styles.checkboxRowCompact : null]}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.checkboxBox,
          { borderColor: theme.inputBorder, backgroundColor: theme.cardBg },
          checked ? { backgroundColor: theme.accent, borderColor: theme.accent } : null,
        ]}
      >
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={[styles.checkboxLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function MemberPick({
  member,
  selected,
  onToggle,
}: {
  member: SocietyMember;
  selected: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[
        styles.memberRow,
        { borderColor: theme.divider },
        selected ? { backgroundColor: theme.accentSoft, borderColor: theme.chipActiveBorder } : null,
      ]}
      onPress={onToggle}
    >
      <View
        style={[
          styles.checkboxBox,
          { borderColor: theme.inputBorder, backgroundColor: theme.cardBg },
          selected ? { backgroundColor: theme.accent, borderColor: theme.accent } : null,
        ]}
      >
        {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <View style={styles.memberText}>
        <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
        <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{member.email}</Text>
      </View>
    </Pressable>
  );
}

const BOX = 22;

const styles = StyleSheet.create({
  block: { marginBottom: 12, gap: 8 },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  reportPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  reportGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  reportCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 4,
  },
  checkboxRowCompact: {
    minHeight: 40,
    paddingVertical: 2,
  },
  checkboxBox: {
    width: BOX,
    height: BOX,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: -1,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  submit: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.65 },
});
