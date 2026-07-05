import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppLogoLoader } from './AppLogoLoader';
import { subscribeGlobalLoading } from '../services/globalApiLoading';
import { useTheme } from '../theme/ThemeContext';

/** Full-screen branded loader for in-flight API work and blocking actions. */
export function GlobalLoadingOverlay() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Loading…');

  useEffect(() => subscribeGlobalLoading((nextVisible, nextMessage) => {
    setVisible(nextVisible);
    setMessage(nextMessage);
  }), []);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.pageBg }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <AppLogoLoader size="lg" tone="onLight" label={message} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
