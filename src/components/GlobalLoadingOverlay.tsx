import { useEffect, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { PremiumLoaderIndicator } from './splash/PremiumLoaderIndicator';
import { globalLoaderSizes, SPLASH_COLORS } from './splash/splashTheme';
import { subscribeGlobalLoading } from '../services/globalApiLoading';

/** Small centred loader over a light scrim — not a full-screen splash layout. */
export function GlobalLoadingOverlay() {
  const { width } = useWindowDimensions();
  const { ringSize, logoSize } = globalLoaderSizes(width);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => subscribeGlobalLoading((nextVisible, nextMessage) => {
    setVisible(nextVisible);
    setMessage(nextMessage);
  }), []);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <PremiumLoaderIndicator
            label={message}
            compact
            ringSize={ringSize}
            logoSize={logoSize}
            logoVariant="splashScreen"
            logoRoundedSquare
          />
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
    backgroundColor: 'rgba(248, 237, 247, 0.55)',
  },
  card: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    shadowColor: '#70088c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: SPLASH_COLORS.lavenderLight,
  },
});
