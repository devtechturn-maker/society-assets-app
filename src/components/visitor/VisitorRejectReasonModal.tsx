import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  visible: boolean;
  visitorName?: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
};

export function VisitorRejectReasonModal({
  visible,
  visitorName,
  loading = false,
  onCancel,
  onSubmit,
}: Props) {
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
    }
  }, [visible]);

  function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Please enter a short reason (at least 3 characters).');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.text }]}>Reject visitor</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {visitorName
              ? `Tell security why ${visitorName} should not be allowed in.`
              : 'Tell security why this visitor should not be allowed in.'}
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>Reason for rejection</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.inputText,
              },
            ]}
            placeholder="e.g. Not expecting anyone today"
            placeholderTextColor={theme.textMuted}
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              if (error) setError(null);
            }}
            multiline
            maxLength={300}
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancelBtn, { borderColor: theme.cardBorder }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.rejectBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.rejectText}>{loading ? 'Rejecting…' : 'Reject visitor'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  error: {
    color: '#dc2626',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  cancelText: {
    fontWeight: '700',
    fontSize: 14,
  },
  rejectText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
