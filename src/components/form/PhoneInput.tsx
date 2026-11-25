import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

/** Keeps only digits; a pasted +91 / 0 prefix is dropped; never more than 10 digits. */
export function cleanPhone(text: string): string {
  let d = (text ?? '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(d.length - 10);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(d.length - 10);
  return d.slice(0, 10);
}

/** True when the value is exactly a 10-digit Indian mobile number. */
export function isValidPhone(text: string | null | undefined): boolean {
  return /^\d{10}$/.test(text ?? '');
}

/** v23: mobile number box. Number keypad, digits only, at most 10 digits (same props as TextInput). */
export const PhoneInput = forwardRef<TextInput, TextInputProps>(function PhoneInput({ onChangeText, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      {...props}
      keyboardType="number-pad"
      maxLength={14}
      autoComplete={props.autoComplete ?? 'tel'}
      onChangeText={(t) => onChangeText?.(cleanPhone(t))}
    />
  );
});
