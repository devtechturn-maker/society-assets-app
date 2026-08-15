import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { UiIcon } from '../../components/UiIcon';
import { useTheme } from '../../theme/ThemeContext';

type MenuItem = {
  label: string;
  routePath: string;
  icon: 'help' | 'info' | 'building';
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Help', routePath: 'help', icon: 'help' },
  { label: 'About Us', routePath: 'about-us', icon: 'info' },
];

type Props = {
  displayName: string;
  societyName?: string;
  onNavigate: (routePath: string) => void;
  onLogout?: () => void;
};

export function GateKeeperProfileModule({ displayName, societyName, onNavigate, onLogout }: Props) {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionCard title="Gate security profile" subtitle={societyName ?? 'Your security desk account'}>
        <View style={[styles.avatar, { borderColor: theme.accentGold, backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.avatarText, { color: theme.accentGold }]}>
            {displayName.trim().slice(0, 2).toUpperCase() || 'GK'}
          </Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>Gate keeper access</Text>
      </SectionCard>

      <SectionCard title="More" subtitle="Help and product information">
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.routePath}
            onPress={() => onNavigate(item.routePath)}
            style={[styles.menuRow, { borderColor: theme.cardBorder }]}
          >
            <UiIcon name={item.icon} size={20} color={theme.accentGold} />
            <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </SectionCard>

      {onLogout ? (
        <Pressable
          onPress={onLogout}
          style={[styles.logoutBtn, { borderColor: 'rgba(239, 68, 68, 0.35)', backgroundColor: '#fef2f2' }]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 28, gap: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  meta: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
