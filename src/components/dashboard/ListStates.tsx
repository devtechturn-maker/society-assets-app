import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { UiIcon } from '../UiIcon';
import type { UiIconName } from '../../constants/uiIcons';
import { useTheme } from '../../theme/ThemeContext';

export function ListLoading() {
  const { theme } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.accentGold} />
    </View>
  );
}

export function ListError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.retryText, { color: theme.accent }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ListEmptyProps = {
  /** Legacy single-line empty copy (used as the heading when `title` is omitted). */
  message?: string;
  title?: string;
  subtitle?: string;
  icon?: UiIconName;
};

export function ListEmpty({ message, title, subtitle, icon }: ListEmptyProps) {
  const { theme } = useTheme();
  const heading = title ?? message;
  const body = subtitle;

  return (
    <View style={styles.emptyWrap}>
      {icon ? (
        <View style={[styles.emptyIconHalo, { backgroundColor: theme.accentSoft }]}>
          <UiIcon name={icon} size={28} color={theme.accent} />
        </View>
      ) : null}
      {heading ? (
        <Text style={[styles.emptyTitle, { color: theme.textSoft }]}>{heading}</Text>
      ) : null}
      {body ? (
        <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>{body}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 24, alignItems: 'center' },
  errorWrap: { paddingVertical: 16, alignItems: 'center', gap: 12 },
  error: { color: '#dc2626', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { fontSize: 14, fontWeight: '700' },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIconHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
  },
});
