import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VisitorSummary } from '../../types/api';
import { AuthenticatedImage } from '../chat/AuthenticatedImage';
import { resolveVisitorPhotoPath, visitorHasPhoto, visitorInitials, type VisitorPhotoPortal } from '../../utils/visitorPhoto';
import { useTheme } from '../../theme/ThemeContext';
import { VisitorPhotoLightbox } from './VisitorPhotoLightbox';

type Props = {
  visitor: Pick<VisitorSummary, 'id' | 'visitorName' | 'photoPath' | 'photoUrl' | 'memberPhotoUrl'>;
  memberPortal?: boolean;
  photoPortal?: VisitorPhotoPortal;
  size?: number;
  localUri?: string;
  expandable?: boolean;
};

export function VisitorAvatar({
  visitor,
  memberPortal = true,
  photoPortal,
  size = 52,
  localUri,
  expandable = false,
}: Props) {
  const { theme } = useTheme();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const portal: VisitorPhotoPortal = photoPortal ?? (memberPortal ? 'member' : 'gatekeeper');
  const photoPath = localUri ? undefined : resolveVisitorPhotoPath(visitor, portal);
  const showPhoto = Boolean(localUri || (photoPath && visitorHasPhoto(visitor)));
  const canExpand = expandable && showPhoto;

  if (showPhoto) {
    const image = (
      <AuthenticatedImage
        path={photoPath}
        localUri={localUri}
        style={[styles.photo, { width: size, height: size, borderRadius: size / 4 }]}
      />
    );

    return (
      <>
        {canExpand ? (
          <Pressable
            onPress={() => setLightboxOpen(true)}
            accessibilityLabel={`View photo of ${visitor.visitorName}`}
            accessibilityRole="button"
          >
            {image}
          </Pressable>
        ) : (
          image
        )}
        {canExpand ? (
          <VisitorPhotoLightbox
            visible={lightboxOpen}
            photoPath={photoPath}
            localUri={localUri}
            title={visitor.visitorName}
            onClose={() => setLightboxOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: theme.accentSoft,
          borderColor: theme.accentGold,
        },
      ]}
    >
      <Text style={[styles.initials, { color: theme.accentGold, fontSize: size * 0.32 }]}>
        {visitorInitials(visitor.visitorName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initials: {
    fontWeight: '800',
  },
});
