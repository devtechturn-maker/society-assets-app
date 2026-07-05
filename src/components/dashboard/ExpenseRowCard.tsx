import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RecentExpense } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, formatDateTime, formatInr, formatMonthRange } from '../../utils/format';
import { Badge, paymentBadgeTone } from './Badge';

type Props = {
  row: RecentExpense;
  showMember?: boolean;
  showEntryType?: boolean;
  children?: ReactNode;
};

export function ExpenseRowCard({ row, showMember = false, showEntryType = false, children }: Props) {
  const { theme } = useTheme();
  const period =
    row.maintenanceFromMonth || row.maintenanceToMonth
      ? formatMonthRange(row.maintenanceFromMonth, row.maintenanceToMonth)
      : null;

  return (
    <View style={[styles.card, { borderTopColor: theme.divider }]}>
      <View style={styles.top}>
        <View style={styles.badges}>
          {showEntryType ? (
            <Badge
              label={row.entryType === 'INCOME' ? 'Income' : 'Expense'}
              tone={row.entryType === 'INCOME' ? 'success' : 'warn'}
            />
          ) : null}
          <Badge
            label={row.category || '—'}
            tone={row.entryType === 'INCOME' ? 'success' : 'info'}
          />
        </View>
        <Text style={[styles.amount, { color: theme.text }]}>{formatInr(row.amount)}</Text>
      </View>
      {!showMember && row.flatNumber ? (
        <Text style={[styles.meta, { color: theme.textSoft }]}>Flat: {row.flatNumber}</Text>
      ) : null}
      {showMember && (row.memberName || row.flatNumber) ? (
        <Text style={[styles.member, { color: theme.text }]}>
          {row.memberName ?? '—'}
          {row.flatNumber ? ` · ${row.flatNumber}` : ''}
        </Text>
      ) : null}
      {row.memberEmail ? <Text style={[styles.email, { color: theme.textMuted }]}>{row.memberEmail}</Text> : null}
      {period ? <Text style={[styles.meta, { color: theme.textSoft }]}>Period: {period}</Text> : null}
      <Text style={[styles.meta, { color: theme.textSoft }]}>
        Description: {row.description?.trim() ? row.description : '—'}
      </Text>
      <View style={styles.footer}>
        <Badge label={row.paymentType || '—'} tone={paymentBadgeTone(row.paymentType)} />
        <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(row.expenseDate)}</Text>
      </View>
      <Text style={[styles.created, { color: theme.textMuted }]}>Created {formatDateTime(row.createdAt)}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderTopWidth: 1,
    paddingVertical: 12,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  member: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  email: { fontSize: 12 },
  meta: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  date: { fontSize: 12 },
  created: { fontSize: 11, marginTop: 2 },
});
