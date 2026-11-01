import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = { visible: boolean; loading: boolean; onPress: () => void };

/** "Load older entries" at the end of a paged history list. */
export function LoadMoreButton({ visible, loading, onPress }: Props) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.btn, { borderColor: theme.cardBorder }]}
    >
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Text style={[styles.text, { color: theme.accent }]}>Load older entries</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 12, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  text: { fontWeight: '700', fontSize: 14 },
});
