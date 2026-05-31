import { StyleSheet, Text, View } from 'react-native';

type Tone = 'info' | 'warn' | 'neutral';

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  info: { bg: '#e0f2fe', text: '#0369a1' },
  warn: { bg: '#ffedd5', text: '#c2410c' },
  neutral: { bg: '#f1f5f9', text: '#475569' },
};

type Props = {
  label: string;
  tone?: Tone;
};

export function Badge({ label, tone = 'info' }: Props) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.text }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function paymentBadgeTone(type?: string | null): Tone {
  if (!type || type === '-') return 'neutral';
  return type.toUpperCase() === 'ONLINE' ? 'info' : 'warn';
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '100%',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
