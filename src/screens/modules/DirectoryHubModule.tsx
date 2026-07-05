import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UiIcon } from '../../components/UiIcon';
import { ListEmpty } from '../../components/dashboard/ListStates';
import {
  directorySectionTitle,
  directoryTilesFor,
  type DirectoryHubTile,
  type DirectoryPortal,
} from '../../constants/directoryHub';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { useTheme } from '../../theme/ThemeContext';

function DirectoryHub({
  tiles,
  onOpenSection,
}: {
  tiles: DirectoryHubTile[];
  onOpenSection: (sectionId: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.text }]}>Directory</Text>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.id}
            style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
            onPress={() => onOpenSection(tile.id)}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <UiIcon name={tile.icon} size={30} color={theme.text} />
            </View>
            <Text style={[styles.tileLabel, { color: theme.text }]} numberOfLines={2}>
              {tile.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function DirectorySectionShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const { theme } = useTheme();

  useHardwareBack(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack]),
    true
  );

  return (
    <View style={styles.sectionRoot}>
      <View style={[styles.sectionHeader, { borderBottomColor: theme.divider }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Directory</Text>
        </Pressable>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DirectorySectionPlaceholder({
  portal,
  sectionId,
  onBack,
}: {
  portal: DirectoryPortal;
  sectionId: string;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  const title = directorySectionTitle(portal, sectionId);

  return (
    <DirectorySectionShell title={title} onBack={onBack}>
      <ScrollView contentContainerStyle={styles.placeholderContent}>
        <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
          This section is ready for your content. Tell us what you want to show here for {title}.
        </Text>
        <ListEmpty message={`${title} will appear here.`} />
      </ScrollView>
    </DirectorySectionShell>
  );
}

type Props = {
  portal: DirectoryPortal;
  renderSection?: (sectionId: string, onBack: () => void) => ReactNode | null;
};

export function DirectoryHubModule({ portal, renderSection }: Props) {
  const [section, setSection] = useState<string | null>(null);
  const tiles = directoryTilesFor(portal);

  if (section) {
    const onBack = () => setSection(null);
    const custom = renderSection?.(section, onBack);
    if (custom) {
      return <>{custom}</>;
    }
    return <DirectorySectionPlaceholder portal={portal} sectionId={section} onBack={onBack} />;
  }

  return <DirectoryHub tiles={tiles} onOpenSection={setSection} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  tilePressed: {
    opacity: 0.82,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionRoot: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  placeholderContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
});
