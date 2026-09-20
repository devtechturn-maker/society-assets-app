import { Modal, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { AppLoader } from './AppLoader';
import { subscribeGlobalLoading } from '../services/globalApiLoading';

/**
 * Single full-app loading overlay driven by the global API / blocking loader service.
 * Do not stack screen-level full-page loaders on top of this.
 */
export function GlobalLoadingOverlay() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Loading...');

  useEffect(
    () =>
      subscribeGlobalLoading((nextVisible, nextMessage) => {
        setVisible(nextVisible);
        setMessage(nextMessage);
      }),
    []
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppLoader size="lg" label={message || 'Loading...'} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  card: {
    minWidth: 120,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
});
