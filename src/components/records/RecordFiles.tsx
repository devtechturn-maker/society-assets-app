import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { secureCachePath } from '../../services/secureFileCache';
import { useDocumentScreenProtection } from '../../services/screenProtection';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/env';
import { getToken } from '../../services/storage';
import type { FileVisibility, RecordFile } from '../../services/records';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { AuthenticatedImage } from '../chat/AuthenticatedImage';

type Confirm = ReturnType<typeof useAppAlert>['confirm'];

/** Asks the office who may open a file before it is uploaded. Closing the dialog keeps the usual choice: all members. */
export function askFileVisibility(confirm: Confirm): Promise<FileVisibility> {
  return new Promise((resolve) => {
    confirm({
      title: 'Who can open this file?',
      message: 'Office only: chairman, treasurer, committee and auditor. Members will not see it at all.',
      cancelText: 'All members',
      confirmText: 'Office only',
      onCancel: () => resolve('ALL'),
      onConfirm: () => resolve('OFFICE'),
    });
  });
}

/**
 * Attachments of a meeting or Tharav. Photos show inline (page by page); PDFs open in the phone's viewer.
 * {@code onViewed} reports each file the reader has seen (photos when shown, PDFs when opened).
 */
export function RecordFiles({
  files,
  pathFor,
  onViewed,
  onRemove,
  onToggleVisibility,
}: {
  files: RecordFile[];
  pathFor: (fileId: string) => string;
  onViewed?: (fileId: string) => void;
  onRemove?: (fileId: string) => void;
  /** Office: switch a file between all members and office only. */
  onToggleVisibility?: (fileId: string, next: FileVisibility) => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [opening, setOpening] = useState<string | null>(null);
  useDocumentScreenProtection(files.length > 0);

  async function openPdf(file: RecordFile) {
    setOpening(file.id);
    try {
      const token = await getToken();
      const target = await secureCachePath(`record-${file.id}.pdf`);
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}${pathFor(file.id)}`, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (result.status !== 200) throw new Error('Could not download the document');
      onViewed?.(file.id);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: file.name });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open the document', 'error');
    } finally {
      setOpening(null);
    }
  }

  if (!files.length) return null;
  return (
    <View style={styles.list}>
      {files.map((file) => {
        const pdf = file.contentType === 'application/pdf';
        return (
          <View key={file.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
            <View style={styles.head}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {files.length > 1 ? `Page ${file.page} · ` : ''}
                {file.name}
              </Text>
              <View style={styles.actions}>
                {file.visibility === 'OFFICE' ? (
                  <View style={styles.officeBadge}>
                    <Ionicons name="lock-closed" size={11} color="#92400e" />
                    <Text style={styles.officeText}>Office only</Text>
                  </View>
                ) : null}
                {onToggleVisibility ? (
                  <Pressable
                    accessibilityLabel={file.visibility === 'OFFICE' ? 'Show to all members' : 'Make office only'}
                    onPress={() => onToggleVisibility(file.id, file.visibility === 'OFFICE' ? 'ALL' : 'OFFICE')}
                    hitSlop={8}
                  >
                    <Ionicons name={file.visibility === 'OFFICE' ? 'lock-open-outline' : 'lock-closed-outline'} size={18} color={theme.accent} />
                  </Pressable>
                ) : null}
                {onRemove ? (
                  <Pressable onPress={() => onRemove(file.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {pdf ? (
              <Pressable
                onPress={() => void openPdf(file)}
                style={({ pressed }) => [styles.pdf, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                {opening === file.id ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontWeight: '800' }}>Open PDF</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View onLayout={() => onViewed?.(file.id)}>
                <AuthenticatedImage path={pathFor(file.id)} style={styles.image} resizeMode="contain" />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  item: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  officeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  officeText: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  pdf: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  image: { width: '100%', height: 420, borderRadius: 8 },
});
