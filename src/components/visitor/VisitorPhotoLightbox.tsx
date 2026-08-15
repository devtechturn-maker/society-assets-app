import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '../chat/AuthenticatedImage';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  visible: boolean;
  photoPath?: string;
  localUri?: string;
  title?: string;
  onClose: () => void;
};

export function VisitorPhotoLightbox({ visible, photoPath, localUri, title, onClose }: Props) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const imageSize = Math.min(width - 40, height * 0.62, 420);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close photo" />
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={styles.titleSpacer} />
            )}
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>
          <AuthenticatedImage
            path={photoPath}
            localUri={localUri}
            resizeMode="contain"
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: 16,
              backgroundColor: '#0f172a',
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  sheet: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  toolbar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    maxWidth: 420,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  titleSpacer: { flex: 1 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
