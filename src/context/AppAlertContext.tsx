import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/themes';

export type AlertVariant = 'info' | 'success' | 'error' | 'warning';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void | Promise<void>;
};

type AlertState = {
  title: string;
  message?: string;
  variant: AlertVariant;
  buttons: AlertButton[];
};

type ConfirmOptions = {
  title: string;
  message?: string;
  cancelText?: string;
  confirmText?: string;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
};

type AppAlertContextValue = {
  alert: (title: string, message?: string, options?: { variant?: AlertVariant }) => void;
  confirm: (options: ConfirmOptions) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

function inferVariant(title: string): AlertVariant {
  const t = title.toLowerCase();
  if (
    t.includes('success') ||
    t.includes('saved') ||
    t.includes('added') ||
    t.includes('sent') ||
    t.includes('complete') ||
    t.includes('created') ||
    t.includes('delivered')
  ) {
    return 'success';
  }
  if (
    t.includes('fail') ||
    t.includes('error') ||
    t.includes('invalid') ||
    t.includes('required') ||
    t.includes('could not') ||
    t.includes('unable')
  ) {
    return 'error';
  }
  if (t.includes('remove') || t.includes('delete') || t.includes('confirm')) {
    return 'warning';
  }
  return 'info';
}

const VARIANT_META: Record<
  AlertVariant,
  { icon: string; accent: (t: AppTheme) => string; soft: (t: AppTheme) => string }
> = {
  info: {
    icon: 'ℹ',
    accent: (t) => t.accent,
    soft: (t) => 'rgba(13, 41, 80, 0.12)',
  },
  success: {
    icon: '✓',
    accent: () => '#059669',
    soft: () => 'rgba(5, 150, 105, 0.14)',
  },
  error: {
    icon: '✕',
    accent: (t) => t.danger,
    soft: (t) => 'rgba(239, 68, 68, 0.12)',
  },
  warning: {
    icon: '!',
    accent: () => '#d97706',
    soft: () => 'rgba(217, 119, 6, 0.14)',
  },
};

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  const dismiss = useCallback(() => setState(null), []);

  const runButton = useCallback(
    async (btn: AlertButton) => {
      dismiss();
      try {
        await btn.onPress?.();
      } catch {
        // Caller handles errors in onPress if needed
      }
    },
    [dismiss]
  );

  const alert = useCallback(
    (title: string, message?: string, options?: { variant?: AlertVariant }) => {
      setState({
        title,
        message,
        variant: options?.variant ?? inferVariant(title),
        buttons: [{ text: 'OK', style: 'default' }],
      });
    },
    []
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({
      title: options.title,
      message: options.message,
      variant: 'warning',
      buttons: [
        { text: options.cancelText ?? 'Cancel', style: 'cancel', onPress: options.onCancel },
        {
          text: options.confirmText ?? 'OK',
          style: options.destructive ? 'destructive' : 'default',
          onPress: options.onConfirm,
        },
      ],
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      {state ? (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={dismiss}
        >
          <AppAlertDialog state={state} onDismiss={dismiss} onButtonPress={runButton} />
        </Modal>
      ) : null}
    </AppAlertContext.Provider>
  );
}

function AppAlertDialog({
  state,
  onDismiss,
  onButtonPress,
}: {
  state: AlertState;
  onDismiss: () => void;
  onButtonPress: (btn: AlertButton) => void;
}) {
  const { theme } = useTheme();
  const meta = VARIANT_META[state.variant];
  const accent = meta.accent(theme);
  const soft = meta.soft(theme);
  const stacked = state.buttons.length > 2;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Dismiss dialog" />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: soft }]}>
          <Text style={[styles.iconText, { color: accent }]}>{meta.icon}</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{state.title}</Text>
        {state.message ? (
          <Text style={[styles.message, { color: theme.textMuted }]}>{state.message}</Text>
        ) : null}
        <View style={[styles.actions, stacked ? styles.actionsStacked : null]}>
          {state.buttons.map((btn, index) => (
            <AlertActionButton
              key={`${btn.text}-${index}`}
              button={btn}
              theme={theme}
              accent={accent}
              stacked={stacked}
              onPress={() => onButtonPress(btn)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function AlertActionButton({
  button,
  theme,
  accent,
  stacked,
  onPress,
}: {
  button: AlertButton;
  theme: AppTheme;
  accent: string;
  stacked: boolean;
  onPress: () => void;
}) {
  const style = button.style ?? 'default';
  const btnStyles: StyleProp<ViewStyle>[] = [styles.btn, stacked ? styles.btnStacked : styles.btnInline];

  let bg = accent;
  let textColor = '#ffffff';
  let borderColor = 'transparent';

  if (style === 'cancel') {
    bg = theme.cardBg;
    textColor = theme.text;
    borderColor = theme.inputBorder;
  } else if (style === 'destructive') {
    bg = theme.danger;
    textColor = '#ffffff';
  }

  btnStyles.push({
    backgroundColor: bg,
    borderColor,
    borderWidth: style === 'cancel' ? 1 : 0,
  });

  return (
    <Pressable style={btnStyles} onPress={onPress}>
      <Text style={[styles.btnText, { color: textColor }]}>{button.text}</Text>
    </Pressable>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 26,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnInline: {
    flex: 1,
  },
  btnStacked: {
    width: '100%',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
