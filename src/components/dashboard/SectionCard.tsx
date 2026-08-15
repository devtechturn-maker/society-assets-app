import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, headerRight, children }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, styles.cardShadow, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  headText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
});
