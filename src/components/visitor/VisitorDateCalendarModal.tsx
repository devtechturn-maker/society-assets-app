import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { compareIsoDate, todayIsoDate } from '../../utils/dates';
import type { VisitorDateSelection } from '../../utils/visitorHistoryDate';

type PickMode = 'single' | 'range';

type Props = {
  visible: boolean;
  selection: VisitorDateSelection;
  onClose: () => void;
  onApply: (selection: VisitorDateSelection) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthMatrix(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function initialMonth(selection: VisitorDateSelection): { year: number; month: number } {
  const ref =
    selection.mode === 'single'
      ? selection.date
      : selection.mode === 'range'
        ? selection.from
        : todayIsoDate();
  const [year, month] = ref.split('-').map(Number);
  return { year, month };
}

export function VisitorDateCalendarModal({ visible, selection, onClose, onApply }: Props) {
  const { theme } = useTheme();
  const [{ year, month }, setMonth] = useState(() => initialMonth(selection));
  const [pickMode, setPickMode] = useState<PickMode>('single');
  const [singleDate, setSingleDate] = useState(
    selection.mode === 'single' ? selection.date : todayIsoDate()
  );
  const [rangeFrom, setRangeFrom] = useState(
    selection.mode === 'range' ? selection.from : todayIsoDate()
  );
  const [rangeTo, setRangeTo] = useState(
    selection.mode === 'range' ? selection.to : todayIsoDate()
  );
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const month = initialMonth(selection);
    setMonth(month);
    setPickMode(selection.mode === 'range' ? 'range' : 'single');
    setSingleDate(selection.mode === 'single' ? selection.date : todayIsoDate());
    setRangeFrom(selection.mode === 'range' ? selection.from : todayIsoDate());
    setRangeTo(selection.mode === 'range' ? selection.to : todayIsoDate());
    setRangeAnchor(null);
  }, [visible, selection]);

  const matrix = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  function onDayPress(day: number) {
    const iso = toIsoDate(year, month, day);
    if (pickMode === 'single') {
      setSingleDate(iso);
      return;
    }
    if (!rangeAnchor) {
      setRangeAnchor(iso);
      setRangeFrom(iso);
      setRangeTo(iso);
      return;
    }
    const start = compareIsoDate(rangeAnchor, iso) <= 0 ? rangeAnchor : iso;
    const end = compareIsoDate(rangeAnchor, iso) <= 0 ? iso : rangeAnchor;
    setRangeFrom(start);
    setRangeTo(end);
    setRangeAnchor(null);
  }

  function isInRange(iso: string): boolean {
    if (pickMode !== 'range') return false;
    return compareIsoDate(iso, rangeFrom) >= 0 && compareIsoDate(iso, rangeTo) <= 0;
  }

  function isSelected(iso: string): boolean {
    if (pickMode === 'single') return iso === singleDate;
    return iso === rangeFrom || iso === rangeTo;
  }

  function handleApply() {
    if (pickMode === 'single') {
      onApply({ mode: 'single', date: singleDate });
      return;
    }
    onApply({ mode: 'range', from: rangeFrom, to: rangeTo });
  }

  function handleResetToday() {
    onApply({ mode: 'today' });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.toolbar}>
            <Text style={[styles.title, { color: theme.text }]}>Choose date</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <View style={styles.modeRow}>
            {(['single', 'range'] as PickMode[]).map((mode) => {
              const active = pickMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setPickMode(mode);
                    setRangeAnchor(null);
                  }}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                      borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '700', fontSize: 13 }}>
                    {mode === 'single' ? 'Single day' : 'Date range'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.monthBar}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={theme.accent} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={22} color={theme.accent} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((label) => (
              <Text key={label} style={[styles.weekday, { color: theme.textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          {matrix.map((week, rowIndex) => (
            <View key={`week-${rowIndex}`} style={styles.weekRow}>
              {week.map((day, colIndex) => {
                if (day == null) {
                  return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.dayCell} />;
                }
                const iso = toIsoDate(year, month, day);
                const selected = isSelected(iso);
                const inRange = isInRange(iso);
                return (
                  <Pressable
                    key={iso}
                    onPress={() => onDayPress(day)}
                    style={[
                      styles.dayCell,
                      inRange ? { backgroundColor: theme.accentSoft } : null,
                      selected ? { backgroundColor: theme.accent, borderRadius: 10 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: selected ? '#fff' : theme.text },
                        inRange && !selected ? { color: theme.accent, fontWeight: '700' } : null,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            {pickMode === 'single'
              ? 'Tap a day, then Apply.'
              : rangeAnchor
                ? 'Tap the end date for your range.'
                : 'Tap start and end dates for your range.'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={handleResetToday}
              style={[styles.secondaryBtn, { borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.secondaryText, { color: theme.textMuted }]}>Today</Text>
            </Pressable>
            <Pressable onPress={handleApply} style={[styles.primaryBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.primaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '700', fontSize: 14 },
  primaryBtn: { flex: 1.4, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
