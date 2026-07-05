import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import {
  JOIN_CODE_GROUP_SIZE,
  JOIN_CODE_LENGTH,
  normalizeJoinCodeInput,
} from '../../utils/societyJoinShare';
import { WIZARD_ACCENT } from './wizardStyles';

type Props = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
};

export function JoinCodeBoxInput({ value, onChange, autoFocus, onComplete }: Props) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const normalized = normalizeJoinCodeInput(value);
  const chars = Array.from({ length: JOIN_CODE_LENGTH }, (_, i) => normalized[i] ?? '');

  useEffect(() => {
    if (autoFocus) {
      refs.current[0]?.focus();
    }
  }, [autoFocus]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, JOIN_CODE_LENGTH - 1));
    refs.current[clamped]?.focus();
  }

  function emitChange(next: string, focusAfter?: number) {
    onChange(next);
    if (next.length === JOIN_CODE_LENGTH) {
      onComplete?.(next);
    }
    if (focusAfter != null) {
      focusIndex(focusAfter);
    }
  }

  function applyInput(index: number, text: string) {
    const cleaned = normalizeJoinCodeInput(text);
    if (!cleaned) {
      const next = normalized.slice(0, index) + normalized.slice(index + 1);
      emitChange(next, Math.max(0, index - 1));
      return;
    }

    if (cleaned.length > 1) {
      const merged = normalizeJoinCodeInput(normalized.slice(0, index) + cleaned);
      emitChange(merged, Math.min(merged.length, JOIN_CODE_LENGTH - 1));
      return;
    }

    const next = normalizeJoinCodeInput(normalized.slice(0, index) + cleaned + normalized.slice(index + 1));
    emitChange(next, index < JOIN_CODE_LENGTH - 1 ? index + 1 : index);
  }

  function handleKeyPress(index: number, key: string) {
    if (key !== 'Backspace' || chars[index]) {
      return;
    }
    if (index === 0) {
      return;
    }
    const next = normalized.slice(0, index - 1) + normalized.slice(index);
    emitChange(next, index - 1);
  }

  const groups = Array.from({ length: JOIN_CODE_LENGTH / JOIN_CODE_GROUP_SIZE }, (_, groupIndex) => groupIndex);

  return (
    <Pressable style={styles.wrap} onPress={() => focusIndex(normalized.length || 0)}>
      <View style={styles.grid}>
        {groups.map((groupIndex) => {
          const start = groupIndex * JOIN_CODE_GROUP_SIZE;
          return (
            <View key={start} style={styles.groupBlock}>
              {groupIndex > 0 ? <Text style={styles.separator}>-</Text> : null}
              <View style={styles.group}>
                {Array.from({ length: JOIN_CODE_GROUP_SIZE }, (_, offset) => {
                  const index = start + offset;
                  const filled = Boolean(chars[index]);
                  const focused = focusedIndex === index;
                  return (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        refs.current[index] = ref;
                      }}
                      style={[
                        styles.box,
                        filled && styles.boxFilled,
                        focused && styles.boxFocused,
                      ]}
                      value={chars[index]}
                      onChangeText={(text) => applyInput(index, text)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
                      maxLength={JOIN_CODE_LENGTH}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      autoComplete="off"
                      keyboardType="default"
                      textAlign="center"
                      selectTextOnFocus
                      caretHidden={false}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const BOX_SIZE = 34;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  groupBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  separator: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.muted,
    marginHorizontal: 2,
  },
  group: {
    flexDirection: 'row',
    gap: 6,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE + 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    fontWeight: '800',
    color: colors.heading,
    padding: 0,
  },
  boxFilled: {
    borderColor: '#d8b4fe',
    backgroundColor: '#faf5ff',
  },
  boxFocused: {
    borderColor: WIZARD_ACCENT,
    backgroundColor: '#fff',
  },
});
