import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { secureCachePath } from '../../services/secureFileCache';
import { useDocumentScreenProtection } from '../../services/screenProtection';
import { API_BASE_URL } from '../../config/env';
import { getToken } from '../../services/storage';

type Props = {
  path?: string;
  localUri?: string;
  style?: object;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
};

function cachePathFor(path: string): Promise<string> {
  return secureCachePath(`img-${path}.img`);
}

export function AuthenticatedImage({ path, localUri, style, resizeMode = 'cover' }: Props) {
  const [uri, setUri] = useState<string | null>(localUri ?? null);
  const [failed, setFailed] = useState(false);
  // Society photos (chat, complaints, visitors, payment proofs) cannot be screenshotted while shown.
  useDocumentScreenProtection(!localUri);

  useEffect(() => {
    if (localUri) {
      setUri(localUri);
      setFailed(false);
      return;
    }
    if (!path) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const cached = await cachePathFor(path);
        const existing = await FileSystem.getInfoAsync(cached);
        if (existing.exists && existing.uri) {
          if (!cancelled) setUri(existing.uri);
          return;
        }

        const token = await getToken();
        const remote = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
        const result = await FileSystem.downloadAsync(remote, cached, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) return;
        if (result.status === 200) {
          setUri(result.uri);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, localUri]);

  if (failed) {
    return (
      <View style={[styles.loading, style]}>
        <Text style={styles.errorText}>Photo unavailable</Text>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.loading, style]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Image source={{ uri }} style={[styles.image, style]} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  loading: {
    width: 220,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#64748b',
  },
});
