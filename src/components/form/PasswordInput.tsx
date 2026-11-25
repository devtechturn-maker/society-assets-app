import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEXT_KEYS = ['color', 'fontSize', 'fontWeight', 'fontFamily', 'letterSpacing'] as const;

/**
 * v23: a password box with an eye button to show or hide what was typed. Takes the same props and style as a
 * normal TextInput; the box style goes on the outer frame and the text style on the input inside it.
 */
export const PasswordInput = forwardRef<TextInput, TextInputProps>(function PasswordInput({ style, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const text: TextStyle = {};
  const frame: TextStyle = { ...flat };
  for (const k of TEXT_KEYS) {
    if (flat[k] !== undefined) {
      (text as Record<string, unknown>)[k] = flat[k];
      delete (frame as Record<string, unknown>)[k];
    }
  }
  const iconColor = typeof flat.color === 'string' ? flat.color : '#64748b';
  return (
    <View style={[frame, styles.row]}>
      <TextInput
        ref={ref}
        {...props}
        style={[styles.input, text]}
        secureTextEntry={!visible}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={props.autoCorrect ?? false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        style={styles.eye}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={iconColor} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, padding: 0, margin: 0, minHeight: 22 },
  eye: { paddingLeft: 8 },
});
