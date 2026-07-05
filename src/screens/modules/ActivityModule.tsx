import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  tile: {
    width: '33.333%',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 22,
  },
  tilePressed: {
    opacity: 0.82,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
});
