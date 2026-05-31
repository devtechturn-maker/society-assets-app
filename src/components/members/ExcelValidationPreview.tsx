import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { formatInr } from '../../utils/format';
import type { MemberExcelValidation } from '../../types/api';

type Props = {
  validation: MemberExcelValidation;
};

function rowErrors(errors: string[] | undefined): string[] {
  if (!errors?.length) {
    return [];
  }
  return errors;
}

export function ExcelValidationPreview({ validation }: Props) {
  const { theme } = useTheme();
  const canImport = validation.summary.canImport;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.summary,
          {
            backgroundColor: canImport ? '#ecfdf5' : '#fef2f2',
            borderColor: canImport ? '#6ee7b7' : '#fecaca',
          },
        ]}
      >
        <Text style={[styles.summaryText, { color: canImport ? '#065f46' : '#991b1b' }]}>
          {validation.summary.valid} ready · {validation.summary.invalid} with errors ·{' '}
          {validation.summary.total} total
        </Text>
        <Text style={[styles.summaryHint, { color: canImport ? '#047857' : '#b91c1c' }]}>
          {canImport ? 'All rows are valid — you can import.' : 'Fix rows marked “Has error” before importing.'}
        </Text>
      </View>

      <Text style={[styles.previewTitle, { color: theme.text }]}>All rows from file</Text>

      <ScrollView style={styles.tableScroll} nestedScrollEnabled>
        {validation.rows.map((row) => {
          const hasError = !row.valid;
          const errors = rowErrors(row.errors);
          return (
            <View
              key={row.rowNumber}
              style={[
                styles.rowCard,
                {
                  borderColor: hasError ? '#fecaca' : theme.divider,
                  backgroundColor: hasError ? '#fff1f2' : theme.inputBg,
                },
              ]}
            >
              <View style={styles.rowHead}>
                <Text style={[styles.rowNum, { color: theme.textMuted }]}>Row {row.rowNumber}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: hasError ? '#fee2e2' : '#d1fae5' },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: hasError ? '#b91c1c' : '#047857' }]}>
                    {hasError ? 'Has error' : 'Ready'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cell, { color: theme.text }]}>
                <Text style={styles.label}>Name: </Text>
                {row.name || '—'}
              </Text>
              <Text style={[styles.cell, { color: theme.text }]}>
                <Text style={styles.label}>Email: </Text>
                {row.email || '—'}
              </Text>
              <Text style={[styles.cell, { color: theme.text }]}>
                <Text style={styles.label}>Flat: </Text>
                {row.flatNumber || '—'}
              </Text>
              <Text style={[styles.cell, { color: theme.text }]}>
                <Text style={styles.label}>Phone: </Text>
                {row.phone || '—'}
              </Text>
              <Text style={[styles.cell, { color: theme.text }]}>
                <Text style={styles.label}>Custom maint.: </Text>
                {row.customMaintenanceAmount > 0 ? formatInr(row.customMaintenanceAmount) : '—'}
              </Text>
              {hasError && errors.length > 0 ? (
                <Text style={styles.errorList}>{errors.join(' · ')}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  summary: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  summaryText: { fontSize: 13, fontWeight: '700' },
  summaryHint: { fontSize: 12 },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  tableScroll: { maxHeight: 360 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowNum: { fontSize: 12, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cell: { fontSize: 13 },
  label: { fontWeight: '600' },
  errorList: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '500',
  },
});
