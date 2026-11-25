import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD (or YYYY-MM in month mode) from a local Date. */
export function toIsoDate(d: Date, month = false): string {
  return month ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local Date from YYYY-MM-DD / YYYY-MM, or null. */
export function fromIsoDate(s?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec((s ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1);
  return Number.isNaN(d.getTime()) ? null : d;
}

function label(value: string, month: boolean): string {
  const d = fromIsoDate(value);
  if (!d) return value;
  return month ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DateFieldProps {
  /** YYYY-MM-DD (YYYY-MM when month is true), or '' when empty. */
  value?: string | null;
  /** Called with YYYY-MM-DD (or YYYY-MM), or '' when cleared. Same name as TextInput so it drops in. */
  onChangeText?: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
  /** Store only year and month (YYYY-MM). */
  month?: boolean;
  /** Show a clear (×) button for optional dates. Default true. */
  clearable?: boolean;
  editable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

/** v23: tap to pick a date from the phone's calendar instead of typing YYYY-MM-DD. */
export function DateField({
  value,
  onChangeText,
  placeholder = 'Select date',
  placeholderTextColor,
  style,
  month = false,
  clearable = true,
  editable = true,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const { theme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDate, setIosDate] = useState<Date>(new Date());
  const current = fromIsoDate(value) ?? new Date();
  const hasValue = !!(value && fromIsoDate(value));

  function open() {
    if (!editable) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChangeText?.(toIsoDate(d, month));
        },
      });
    } else {
      setIosDate(current);
      setIosOpen(true);
    }
  }

  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const frame: TextStyle = style
    ? { ...flat }
    : { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderColor: theme.inputBorder, backgroundColor: theme.inputBg };
  const textColor = (flat.color as string) ?? theme.inputText ?? theme.text;
  delete (frame as Record<string, unknown>).color;

  return (
    <>
      <Pressable
        onPress={open}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={hasValue ? `Date ${label(value!, month)}, tap to change` : placeholder}
        style={[frame, styles.row, !editable && { opacity: 0.6 }]}
      >
        <Ionicons name="calendar-outline" size={18} color={hasValue ? textColor : placeholderTextColor ?? theme.placeholder} />
        <Text
          style={[styles.text, { color: hasValue ? textColor : placeholderTextColor ?? theme.placeholder, fontSize: flat.fontSize ?? 15 }]}
          numberOfLines={1}
        >
          {hasValue ? label(value!, month) : placeholder}
        </Text>
        {hasValue && clearable && editable ? (
          <Pressable onPress={() => onChangeText?.('')} hitSlop={10} accessibilityLabel="Clear date">
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.cardBg }]} onPress={() => undefined}>
              <DateTimePicker
                value={iosDate}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_e, d) => d && setIosDate(d)}
              />
              <View style={styles.actions}>
                <Pressable onPress={() => setIosOpen(false)} style={styles.action}>
                  <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChangeText?.(toIsoDate(iosDate, month));
                    setIosOpen(false);
                  }}
                  style={styles.action}
                >
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 16, padding: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, paddingTop: 8 },
  action: { paddingVertical: 8, paddingHorizontal: 6 },
});
