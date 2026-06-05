import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { clearSession } from '../services/storage';
import {
  fetchMemberModules,
  fetchMemberOverview,
  fetchOverview,
  fetchSocietyModules,
  isMemberRole,
} from '../services/api';
import type { LoginData, NavModule } from '../types/api';
import { APPEARANCE_MODULE } from '../constants/appearanceModule';
import {
  FALLBACK_MEMBER_MODULES,
  FALLBACK_SOCIETY_MODULES,
  moduleGlyph,
} from '../constants/fallbackModules';
import { useTheme } from '../theme/ThemeContext';
import { ChatNotificationBanner } from '../components/ChatNotificationBanner';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  registerPushNotificationsWithBackend,
  resolveInitialNotificationGroupId,
  unregisterPushNotificationsFromBackend,
  type ChatPushNotification,
} from '../services/pushNotifications';
import { ModuleRouter } from './modules/ModuleRouter';

type Props = {
  user: LoginData;
  onLogout: () => void;
};

const STAFF_PRIMARY_TABS: { path: string; label: string; glyph: string }[] = [
  { path: 'dashboard', label: 'Home', glyph: '⌂' },
  { path: 'maintenance', label: 'Maint.', glyph: '☰' },
  { path: 'expenses', label: 'Expenses', glyph: '▤' },
  { path: 'reports', label: 'Reports', glyph: '📊' },
];

const MEMBER_PRIMARY_TABS: { path: string; label: string; glyph: string }[] = [
  { path: 'dashboard', label: 'Home', glyph: '⌂' },
  { path: 'maintenance', label: 'Maint.', glyph: '☰' },
  { path: 'chat', label: 'Groups', glyph: '💬' },
];

function societyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function SocietyShell({ user, onLogout }: Props) {
  const { theme, toggleMode, mode } = useTheme();
  const memberPortal = isMemberRole(user.role);
  const [modules, setModules] = useState<NavModule[]>(
    memberPortal ? [...FALLBACK_MEMBER_MODULES] : [...FALLBACK_SOCIETY_MODULES, APPEARANCE_MODULE]
  );
  const [activePath, setActivePath] = useState('dashboard');
  const [societyName, setSocietyName] = useState('Society');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialChatGroupId, setInitialChatGroupId] = useState<string | null>(null);
  const [bannerNotification, setBannerNotification] = useState<ChatPushNotification | null>(null);
  const primaryTabs = memberPortal ? MEMBER_PRIMARY_TABS : STAFF_PRIMARY_TABS;

  const loadMeta = useCallback(async () => {
    try {
      if (memberPortal) {
        const [mods, overview] = await Promise.all([fetchMemberModules(), fetchMemberOverview()]);
        const merged = [...mods].sort((a, b) => a.sortOrder - b.sortOrder);
        if (merged.length > 0) setModules(merged);
        if (overview.societyName) setSocietyName(overview.societyName);
        return;
      }
      const [mods, overview] = await Promise.all([fetchSocietyModules(), fetchOverview()]);
      const merged = [...mods, APPEARANCE_MODULE].sort((a, b) => a.sortOrder - b.sortOrder);
      if (merged.length > 0) setModules(merged);
      if (overview.societyName) setSocietyName(overview.societyName);
    } catch {
      try {
        if (memberPortal) {
          const overview = await fetchMemberOverview();
          if (overview.societyName) setSocietyName(overview.societyName);
        } else {
          const overview = await fetchOverview();
          if (overview.societyName) setSocietyName(overview.societyName);
        }
      } catch {
        /* defaults */
      }
    }
  }, [memberPortal]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const openChatFromNotification = useCallback((groupId?: string) => {
    setActivePath('chat');
    if (groupId) {
      setInitialChatGroupId(groupId);
    }
  }, []);

  useEffect(() => {
    registerPushNotificationsWithBackend();

    void resolveInitialNotificationGroupId().then((groupId) => {
      if (groupId) {
        openChatFromNotification(groupId);
      }
    });

    const openSubscription = addNotificationResponseListener((groupId) => {
      setBannerNotification(null);
      openChatFromNotification(groupId);
    });
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      setBannerNotification(notification);
    });
    return () => {
      openSubscription.remove();
      receivedSubscription.remove();
    };
  }, [user.userId, openChatFromNotification]);

  const activeTitle = useMemo(
    () => modules.find((m) => m.routePath === activePath)?.title ?? 'Dashboard',
    [modules, activePath]
  );

  async function logout() {
    setDrawerOpen(false);
    await unregisterPushNotificationsFromBackend();
    await clearSession();
    onLogout();
  }

  function selectModule(path: string) {
    setActivePath(path);
    setDrawerOpen(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <StatusBar style={theme.statusBar} />

      <ChatNotificationBanner
        notification={bannerNotification}
        onPress={(item) => {
          setBannerNotification(null);
          openChatFromNotification(item.groupId);
        }}
        onDismiss={() => setBannerNotification(null)}
      />

      <LinearGradient colors={[...theme.headerGradient]} style={styles.hero}>
        <View style={styles.heroRow}>
          <View
            style={[
              styles.avatar,
              { borderColor: theme.accentGold, backgroundColor: theme.accentSoft },
            ]}
          >
            <Text style={styles.avatarText}>{societyInitials(societyName)}</Text>
          </View>
          <View style={styles.heroText}>
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.badgeText, { color: theme.accentGold }]}>
                {memberPortal ? 'Member Portal' : 'Society Command'}
              </Text>
            </View>
            <Text style={styles.societyName} numberOfLines={2}>
              {societyName}
            </Text>
            <Text style={[styles.moduleTitle, { color: theme.accentGold }]}>{activeTitle}</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.iconBtn} onPress={toggleMode} accessibilityLabel="Toggle theme">
              <Text style={styles.iconBtnText}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
            {memberPortal ? (
              <Pressable
                style={styles.iconBtn}
                onPress={logout}
                accessibilityLabel="Log out"
              >
                <Text style={styles.logoutHeaderLabel}>Out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.kicker}>
          {memberPortal ? 'Resident access' : 'Financial Command'} · {user.role}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <ModuleRouter
          routePath={activePath}
          memberPortal={memberPortal}
          userId={user.userId}
          userRole={user.role}
          initialChatGroupId={initialChatGroupId}
          onChatGroupConsumed={() => setInitialChatGroupId(null)}
        />
      </View>

      <View style={[styles.bottomBar, { backgroundColor: theme.bottomBarBg, borderTopColor: theme.bottomBarBorder }]}>
        {primaryTabs.map((tab) => {
          const active = activePath === tab.path;
          return (
            <Pressable key={tab.path} style={styles.tab} onPress={() => selectModule(tab.path)}>
              <Text style={[styles.tabGlyph, active ? { color: theme.accentGold } : { color: theme.textMuted }]}>
                {tab.glyph}
              </Text>
              <Text style={[styles.tabLabel, active ? { color: theme.accentGold, fontWeight: '700' } : { color: theme.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.tab} onPress={() => setDrawerOpen(true)}>
          <Text style={[styles.tabGlyph, drawerOpen ? { color: theme.accentGold } : { color: theme.textMuted }]}>
            ☰
          </Text>
          <Text style={[styles.tabLabel, { color: theme.textMuted }]}>
            {memberPortal ? 'Menu' : 'More'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={drawerOpen} animationType="slide" transparent onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerBackdrop}>
          <Pressable style={styles.drawerDismiss} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>
              {memberPortal ? 'Menu' : 'All modules'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modules.map((m) => {
                const active = m.routePath === activePath;
                return (
                  <Pressable
                    key={m.code}
                    style={[
                      styles.drawerItem,
                      active ? { backgroundColor: theme.accentSoft } : null,
                    ]}
                    onPress={() => selectModule(m.routePath)}
                  >
                    <Text style={styles.drawerGlyph}>{moduleGlyph(m.icon)}</Text>
                    <Text style={[styles.drawerLabel, { color: active ? theme.accentGold : theme.text }]}>
                      {m.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={[styles.logoutBtn, { backgroundColor: theme.danger }]} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  heroText: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  societyName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  kicker: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 20 },
  logoutHeaderLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  tabGlyph: { fontSize: 18 },
  tabLabel: { fontSize: 10 },
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerDismiss: { flex: 1 },
  drawer: {
    width: '85%',
    maxWidth: 320,
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerGlyph: { fontSize: 18, width: 24, textAlign: 'center' },
  drawerLabel: { fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
