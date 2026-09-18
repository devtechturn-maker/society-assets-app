import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { UiIcon } from './UiIcon';
import { iconFromPrimeIcon, iconForRoutePath, type UiIconName } from '../constants/uiIcons';
import { useTheme } from '../theme/ThemeContext';

export type MoreMenuItem = {
  label: string;
  routePath: string;
  icon: string;
};

type Props = {
  visible: boolean;
  items: MoreMenuItem[];
  activePath: string;
  bottomOffset: number;
  onClose: () => void;
  onSelect: (routePath: string) => void;
  onLogout?: () => void;
};

const COLUMNS = 4;
const ACCENT = '#0F172A';
const H_PAD = 8;
const ICON_SIZE = 18;

function resolveIcon(item: MoreMenuItem): UiIconName {
  if (item.routePath === '__switch_role__') {
    return 'sync';
  }
  return iconFromPrimeIcon(item.icon) || iconForRoutePath(item.routePath);
}

/**
 * Bottom-expanding More grid above the tab bar.
 * This is the only secondary menu — there is no right drawer/sidebar.
 */
export function MoreBottomMenu({
  visible,
  items,
  activePath,
  bottomOffset,
  onClose,
  onSelect,
  onLogout,
}: Props) {
  const { theme } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.min(windowHeight * 0.55, 440);
  const cellWidth = (windowWidth - H_PAD * 2) / COLUMNS;
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, progress]);

  if (!mounted) {
    return null;
  }

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { bottom: bottomOffset, opacity: progress }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Close more menu" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            bottom: bottomOffset,
            maxHeight: sheetMaxHeight,
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            transform: [{ translateY }],
            opacity: progress,
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.divider }]} />
        </View>
        <Text style={[styles.title, { color: ACCENT }]}>More</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.grid, { paddingHorizontal: H_PAD }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {items.map((item) => {
            const active = activePath === item.routePath;
            const iconName = resolveIcon(item);
            return (
              <Pressable
                key={item.routePath}
                style={({ pressed }) => [
                  styles.cell,
                  { width: cellWidth },
                  active ? { backgroundColor: theme.accentSoft } : null,
                  pressed ? styles.cellPressed : null,
                ]}
                onPress={() => onSelect(item.routePath)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: active ? ACCENT : theme.pageBg,
                      borderColor: active ? ACCENT : theme.cardBorder,
                    },
                  ]}
                >
                  <UiIcon name={iconName} size={ICON_SIZE} color={active ? '#fff' : ACCENT} />
                </View>
                <Text
                  style={[styles.cellLabel, { color: active ? ACCENT : theme.text }]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {onLogout ? (
          <Pressable
            style={[styles.logoutBtn, { borderColor: theme.divider }]}
            onPress={() => {
              onClose();
              onLogout();
            }}
            accessibilityLabel="Log out"
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 999,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  scroll: {
    flexGrow: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 4,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 2,
    borderRadius: 12,
    minHeight: 72,
  },
  cellPressed: {
    opacity: 0.82,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  logoutBtn: {
    marginHorizontal: 14,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
