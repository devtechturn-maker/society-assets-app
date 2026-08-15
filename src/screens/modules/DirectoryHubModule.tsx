import { useCallback, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UiIcon } from '../../components/UiIcon';
import { ListEmpty } from '../../components/dashboard/ListStates';
import {
  directorySectionTitle,
  directoryTilesFor,
  type DirectoryHubTile,
  type DirectoryPortal,
} from '../../constants/directoryHub';
import type { UiIconName } from '../../constants/uiIcons';
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
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Members, contacts, and society staff
      </Text>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.id}
            style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
            onPress={() => onOpenSection(tile.id)}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={[styles.iconHalo, { backgroundColor: theme.accentSoft }]}>
                <UiIcon name={tile.icon} size={26} color={theme.accent} />
              </View>
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
  headerRight,
  children,
}: {
  title: string;
  onBack: () => void;
  headerRight?: ReactNode;
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
        <View style={styles.titleRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
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
  const title = directorySectionTitle(portal, sectionId);
  const emptyCopy = emptyCopyForSection(sectionId, title);

  return (
    <DirectorySectionShell title={title} onBack={onBack}>
      <ScrollView contentContainerStyle={styles.placeholderContent}>
        <ListEmpty icon={emptyCopy.icon} title={emptyCopy.title} subtitle={emptyCopy.subtitle} />
      </ScrollView>
    </DirectorySectionShell>
  );
}

function emptyCopyForSection(
  sectionId: string,
  title: string
): { icon: UiIconName; title: string; subtitle: string } {
  if (sectionId === 'important-contacts' || sectionId === 'emergency') {
    return {
      icon: 'phone',
      title: 'No important contacts yet',
      subtitle: 'Society emergency and utility contacts will appear here.',
    };
  }
  if (sectionId === 'society-staff' || sectionId === 'staff') {
    return {
      icon: 'staff',
      title: 'No society staff yet',
      subtitle: 'Watchmen, plumbers, and other staff will appear here.',
    };
  }
  return {
    icon: 'directory',
    title: `${title} will appear here.`,
    subtitle: 'This section is ready for your content.',
  };
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
    paddingBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 28,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  tile: {
    width: '33.333%',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 28,
  },
  tilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  iconHalo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
});
