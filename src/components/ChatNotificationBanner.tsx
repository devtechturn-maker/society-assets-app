import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import type { ChatPushNotification } from '../services/pushNotifications';

const logoGlyph = require('../../assets/logo-glyph.png');

const AUTO_DISMISS_MS = 5000;

type Props = {
  notification: ChatPushNotification | null;
  onPress: (notification: ChatPushNotification) => void;
  onDismiss: () => void;
};

export function ChatNotificationBanner({ notification, onPress, onDismiss }: Props): ReactNode {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    if (!notification) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -140, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    dismissTimer.current = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [notification, onDismiss, opacity, translateY]);

  if (!notification) {
    return null;
  }

  const topInset = Platform.OS === 'ios' ? 52 : 12;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingTop: topInset,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(notification)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            shadowColor: theme.shadow,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={['#70088c', '#5c0672']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentRail}
        />
        <LinearGradient
          colors={['#70088c', '#5c0672']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoWrap}
        >
          <Image source={logoGlyph} style={styles.logoGlyph} resizeMode="contain" />
        </LinearGradient>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.brand, { color: theme.accentGold }]} numberOfLines={1}>
              Society Assets
            </Text>
            <Text style={[styles.time, { color: theme.textMuted }]}>now</Text>
          </View>
          <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
            {notification.groupName}
          </Text>
          <Text style={[styles.preview, { color: theme.textSoft }]} numberOfLines={2}>
            {notification.preview}
          </Text>
        </View>
        <View style={[styles.chatGlyph, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.chatGlyphText, { color: theme.accentGold }]}>💬</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  accentRail: {
    width: 5,
    alignSelf: 'stretch',
    marginRight: 10,
  },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  logoGlyph: {
    width: 46,
    height: 46,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
  },
  groupName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
  },
  preview: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  chatGlyph: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatGlyphText: {
    fontSize: 16,
  },
});
