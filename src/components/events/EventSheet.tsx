import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

/** Bottom sheet used by every event form (same look as the app's other add-entry modals). */
export function EventSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.grabber, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { borderTopColor: theme.divider }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSoft }]}>
        {label}
        {hint ? <Text style={{ color: theme.textMuted, fontWeight: '400' }}>  {hint}</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export function SheetInput(props: TextInputProps & { large?: boolean }) {
  const { theme } = useTheme();
  const { large, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={theme.placeholder}
      {...rest}
      style={[
        styles.input,
        large ? styles.inputLarge : null,
        { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText },
        style,
      ]}
    />
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { borderColor: active ? theme.accent : theme.chipBorder, backgroundColor: active ? theme.accent : theme.chipBg },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SheetButtons({
  onCancel,
  onSave,
  saving,
  saveLabel = 'Save',
  destructive,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  destructive?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.buttons}>
      <Pressable
        onPress={onCancel}
        disabled={saving}
        style={[styles.btn, styles.btnGhost, { borderColor: theme.inputBorder }]}
        accessibilityRole="button"
      >
        <Text style={[styles.btnGhostText, { color: theme.text }]}>Cancel</Text>
      </Pressable>
      <Pressable
        onPress={onSave}
        disabled={saving}
        style={[styles.btn, { backgroundColor: destructive ? theme.danger : theme.accent, opacity: saving ? 0.6 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>{saving ? 'Saving…' : saveLabel}</Text>
      </Pressable>
    </View>
  );
}

/** Label + amount + thin bar, used for "where money came from / went". */
export function AmountBar({
  label,
  amount,
  percent,
  color,
  trailing,
}: {
  label: string;
  amount: string;
  percent: number;
  color: string;
  trailing?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.bar}>
      <View style={styles.barText}>
        <Text style={[styles.barLabel, { color: theme.textSoft }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.barAmount, { color: theme.text }]}>{amount}</Text>
        {trailing}
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.chipBg }]}>
        <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, percent))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  inputLarge: { fontSize: 24, fontWeight: '800', paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  btnGhostText: { fontSize: 15, fontWeight: '700' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bar: { gap: 6 },
  barText: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { flex: 1, fontSize: 14 },
  barAmount: { fontSize: 14, fontWeight: '700' },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
