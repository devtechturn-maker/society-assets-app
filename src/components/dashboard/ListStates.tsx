import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export function ListLoading() {
  const { theme } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.accentGold} />
    </View>
  );
}

export function ListError({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

export function ListEmpty({ message }: { message: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.empty, { color: theme.textMuted }]}>{message}</Text>;
}

const styles = StyleSheet.create({
  center: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 14, lineHeight: 20 },
  empty: { fontSize: 14, lineHeight: 20 },
});
