import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { UiIcon } from '../UiIcon';
import type { UiIconName } from '../../constants/uiIcons';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  title: string;
  meta?: string | null;
  secondaryMeta?: string | null;
  /** Letter or short text inside the purple avatar circle. */
  avatarInitial?: string;
  /** Icon shown inside the purple avatar when no initial is provided. */
  avatarIcon?: UiIconName;
  muted?: boolean;
  onPress?: () => void;
  /** Trailing call / phone action. */
  onCall?: () => void;
  /** Trailing delete action (keeps red trash styling). */
  onDelete?: () => void;
  trailing?: ReactNode;
  roleLabel?: string | null;
};

export function DirectoryListItem({
  title,
  meta,
  secondaryMeta,
  avatarInitial,
  avatarIcon = 'user',
  muted = false,
  onPress,
  onCall,
  onDelete,
  trailing,
  roleLabel,
}: Props) {
  const { theme } = useTheme();

  const body = (
    <View style={styles.body}>
      <Text style={[styles.title, { color: muted ? theme.textMuted : theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      {meta ? (
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
      {roleLabel ? (
        <View style={[styles.rolePill, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.roleText, { color: theme.accent }]}>{roleLabel}</Text>
        </View>
      ) : null}
      {secondaryMeta ? (
        <Text style={[styles.secondary, { color: theme.textMuted }]} numberOfLines={1}>
          {secondaryMeta}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        styles.cardShadow,
        {
          backgroundColor: theme.cardBg,
          borderColor: muted ? theme.divider : theme.cardBorder,
          opacity: muted ? 0.78 : 1,
          borderStyle: muted ? 'dashed' : 'solid',
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: muted ? theme.chipBg : theme.accentSoft,
            borderColor: muted ? theme.divider : 'transparent',
            borderWidth: muted ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {avatarInitial ? (
          <Text style={[styles.avatarText, { color: muted ? theme.textMuted : theme.accent }]}>
            {avatarInitial}
          </Text>
        ) : (
          <UiIcon name={avatarIcon} size={22} color={muted ? theme.textMuted : theme.accent} />
        )}
      </View>

      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.bodyPressable, pressed ? styles.pressed : null]}
          accessibilityRole="button"
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {onCall ? (
        <Pressable
          onPress={onCall}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Call"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.accentSoft, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <UiIcon name="phone" size={18} color={theme.accent} />
        </Pressable>
      ) : null}

      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: 'rgba(220, 38, 38, 0.08)', opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </Pressable>
      ) : null}

      {trailing}
    </View>
  );
}

/** Filled purple circular “+” control for section headers. */
export function DirectoryAddButton({ onPress, label = 'Add' }: { onPress: () => void; label?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.addBtn,
        styles.addBtnShadow,
        { backgroundColor: theme.accent, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <UiIcon name="plus" size={18} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  pressed: { opacity: 0.92 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  bodyPressable: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  secondary: {
    fontSize: 11,
    marginTop: 4,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
});
