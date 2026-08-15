import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UiIcon } from '../../components/UiIcon';
import {
  activityTilesForPortal,
  type NavPortalKind,
} from '../../constants/activityHub';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  portal: NavPortalKind;
  onNavigate: (routePath: string) => void;
};

export function ActivityModule({ portal, onNavigate }: Props) {
  const { theme } = useTheme();
  const tiles = activityTilesForPortal(portal);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.text }]}>Activity</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Society services and member tools
      </Text>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.routePath}
            style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
            onPress={() => onNavigate(tile.routePath)}
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

      <Text style={[styles.footerHint, { color: theme.textMuted }]}>More coming soon</Text>
    </ScrollView>
  );
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
  footerHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
