import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { AppLogo } from './AppLogo';
import { moduleGlyph } from '../constants/fallbackModules';

export type SideMenuItem = {
  label: string;
  routePath: string;
  icon: string;
};

type Props = {
  visible: boolean;
  items: SideMenuItem[];
  activePath: string;
  societyName?: string;
  onClose: () => void;
  onSelect: (routePath: string) => void;
};

const PANEL_WIDTH = 288;

export function ProfileSideMenu({
  visible,
  items,
  activePath,
  societyName,
  onClose,
  onSelect,
}: Props) {
  const { theme } = useTheme();
  const slideX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(slideX, { toValue: -PANEL_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, slideX, backdropOpacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <LinearGradient colors={[...theme.headerGradient]} style={styles.panelHead}>
            <AppLogo variant="glyph" size={36} framed />
            {societyName ? (
              <Text style={styles.societyName} numberOfLines={2}>
                {societyName}
              </Text>
            ) : null}
          </LinearGradient>

          <View style={styles.menuList}>
            {items.map((item) => {
              const active = activePath === item.routePath;
              return (
                <Pressable
                  key={item.routePath}
                  style={[
                    styles.menuItem,
                    active
                      ? { backgroundColor: theme.accentSoft, borderColor: theme.accentGold }
                      : { borderColor: 'transparent' },
                  ]}
                  onPress={() => onSelect(item.routePath)}
                >
                  <Text style={[styles.menuGlyph, active ? { color: theme.accentGold } : { color: theme.textMuted }]}>
                    {moduleGlyph(item.icon)}
                  </Text>
                  <Text style={[styles.menuLabel, { color: active ? theme.accentGold : theme.text }]}>
                    {item.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={active ? theme.accentGold : theme.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.textMuted }]}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropPress: {
    flex: 1,
  },
  panel: {
    width: PANEL_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  panelHead: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  societyName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  menuList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuGlyph: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    marginTop: 'auto',
    paddingVertical: 18,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
