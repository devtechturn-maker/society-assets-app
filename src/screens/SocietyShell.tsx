import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { clearSession, updateStoredUser } from '../services/storage';
import {
  canSwitchAppView,
  isMemberPortalView,
  resolveInitialAppViewContext,
  setAppViewContext,
  type AppViewContext,
} from '../services/appContext';
import {
  fetchMemberModules,
  fetchMemberOverview,
  fetchMaintenanceSettings,
  fetchOverview,
  fetchSocietyModules,
  isMemberRole,
} from '../services/api';
import type { LoginData, NavModule } from '../types/api';
import { APPEARANCE_MODULE } from '../constants/appearanceModule';
import {
  FALLBACK_MEMBER_MODULES,
  FALLBACK_SOCIETY_MODULES,
  mergeMemberPortalModules,
  moduleGlyph,
} from '../constants/fallbackModules';
import { useTheme } from '../theme/ThemeContext';
import { ChatNotificationBanner } from '../components/ChatNotificationBanner';
import {
  NotificationBellButton,
  NotificationInboxPanel,
} from '../components/NotificationInboxPanel';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  parseAppPushFromResponse,
  registerPushNotificationsWithBackend,
  unregisterPushNotificationsFromBackend,
  type AppPushNotification,
} from '../services/pushNotifications';
import * as Notifications from 'expo-notifications';
import { ModuleRouter } from './modules/ModuleRouter';
import { pushTypeMatchesAudience, type NotificationAudience } from '../utils/notificationAudience';
import { subscribeMemberProfileNavigation } from '../services/memberProfileNavigation';
import { useAppAlert } from '../context/AppAlertContext';
import { mergeLoginUserPatch, userDisplayName } from '../utils/userDisplayName';
import { setMaintenanceSettingsRequiredHandler } from '../services/maintenanceSettingsGate';

type Props = {
  user: LoginData;
  onLogout: () => void;
  onUserUpdated?: (user: LoginData) => void;
};

function societyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function tabLabel(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 11) return trimmed;
  return `${trimmed.slice(0, 10)}…`;
}

function formatRole(role: string | undefined): string {
  switch ((role ?? '').trim().toUpperCase()) {
    case 'CHAIRMAN':
      return 'Chairman';
    case 'TREASURER':
      return 'Treasurer';
    case 'AUDITOR':
      return 'Auditor';
    case 'USER':
      return 'Staff';
    case 'MEMBER':
      return 'Member';
    default:
      return role?.trim() || 'User';
  }
}

export function SocietyShell({ user, onLogout, onUserUpdated }: Props) {
  const { theme, toggleMode, mode } = useTheme();
  const { alert, toast } = useAppAlert();
  const [sessionUser, setSessionUser] = useState(user);
  const [appContext, setAppContextState] = useState<AppViewContext>('CHAIRMAN');
  const [contextReady, setContextReady] = useState(false);
  const [maintenanceConfigured, setMaintenanceConfigured] = useState(true);
  const canSwitchView = canSwitchAppView(user);
  const memberPortal = isMemberPortalView(sessionUser, appContext);
  const notificationAudience = useMemo((): NotificationAudience | null => {
    if (canSwitchView) {
      return appContext;
    }
    if (isMemberRole(user.role)) {
      return 'MEMBER';
    }
    return null;
  }, [canSwitchView, sessionUser.role, appContext]);

  useEffect(() => {
    setSessionUser(user);
  }, [user]);

  const handleUserUpdated = useCallback((patch: Partial<LoginData>) => {
    setSessionUser((current) => mergeLoginUserPatch(current, patch));
  }, []);
  const [modules, setModules] = useState<NavModule[]>(
    memberPortal ? [...FALLBACK_MEMBER_MODULES] : [...FALLBACK_SOCIETY_MODULES, APPEARANCE_MODULE]
  );
  const [activePath, setActivePath] = useState('dashboard');
  const [societyName, setSocietyName] = useState('Society');
  const [initialChatGroupId, setInitialChatGroupId] = useState<string | null>(null);
  const [initialPollId, setInitialPollId] = useState<string | null>(null);
  const [initialComplaintId, setInitialComplaintId] = useState<string | null>(null);
  const [bannerNotification, setBannerNotification] = useState<AppPushNotification | null>(null);
  const inbox = useNotificationInbox(user.userId, notificationAudience);

  useEffect(() => {
    let cancelled = false;
    resolveInitialAppViewContext(user).then((context) => {
      if (!cancelled) {
        setAppContextState(context);
        setContextReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user.userId]);

  useEffect(() => {
    if (!contextReady || !memberPortal) {
      return;
    }
    if (isMemberRole(sessionUser.role) && sessionUser.emailVerified === false) {
      setActivePath('profile');
    }
  }, [contextReady, memberPortal, sessionUser.role, sessionUser.emailVerified]);

  useEffect(() => {
    if (!memberPortal) {
      return;
    }
    return subscribeMemberProfileNavigation(() => {
      setActivePath('profile');
      toast('Please verify your email first.', 'error');
    });
  }, [memberPortal, toast]);

  const loadMeta = useCallback(async () => {
    try {
      if (memberPortal) {
        const [mods, overview] = await Promise.all([fetchMemberModules(), fetchMemberOverview()]);
        const merged = mergeMemberPortalModules(mods);
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
    if (!contextReady) {
      return;
    }
    loadMeta();
  }, [loadMeta, contextReady]);

  useEffect(() => {
    if (!contextReady || memberPortal) {
      return;
    }

    const redirectToMaintenanceSetup = () => {
      setActivePath('settings');
      alert('Maintenance setup required', 'Please set your maintenance settings first.', { variant: 'warning' });
    };

    setMaintenanceSettingsRequiredHandler(redirectToMaintenanceSetup);
    fetchMaintenanceSettings()
      .then((settings) => {
        const configured = settings.configured === true;
        setMaintenanceConfigured(configured);
        if (!configured) {
          redirectToMaintenanceSetup();
        }
      })
      .catch(() => undefined);

    return () => setMaintenanceSettingsRequiredHandler(null);
  }, [contextReady, memberPortal, alert]);

  const selectModule = useCallback(
    (routePath: string) => {
      if (!memberPortal && !maintenanceConfigured && routePath !== 'settings') {
        setActivePath('settings');
        alert('Maintenance setup required', 'Please set your maintenance settings first.', { variant: 'warning' });
        return;
      }
      setActivePath(routePath);
    },
    [memberPortal, maintenanceConfigured, alert]
  );

  useEffect(() => {
    setModules(
      memberPortal ? [...FALLBACK_MEMBER_MODULES] : [...FALLBACK_SOCIETY_MODULES, APPEARANCE_MODULE]
    );
    setActivePath('dashboard');
  }, [memberPortal]);

  const openChatFromNotification = useCallback((groupId?: string) => {
    setActivePath('chat');
    if (groupId) {
      setInitialChatGroupId(groupId);
    }
  }, []);

  const openPollFromNotification = useCallback((pollId?: string) => {
    setActivePath('polls');
    if (pollId) {
      setInitialPollId(pollId);
    }
  }, []);

  const openComplaintFromNotification = useCallback((complaintId?: string) => {
    setActivePath('complaints');
    if (complaintId) {
      setInitialComplaintId(complaintId);
    }
  }, []);

  useEffect(() => {
    registerPushNotificationsWithBackend();

    void (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      const parsed = parseAppPushFromResponse(response);
      if (!parsed) {
        return;
      }
      if (
        notificationAudience &&
        !pushTypeMatchesAudience(parsed.type, notificationAudience)
      ) {
        return;
      }
      await inbox.markPushNotificationAsRead(parsed);
      if (parsed.kind === 'poll') {
        openPollFromNotification(parsed.pollId);
        return;
      }
      if (parsed.kind === 'complaint') {
        openComplaintFromNotification(parsed.complaintId);
        return;
      }
      openChatFromNotification(parsed.groupId);
    })();

    const openSubscription = addNotificationResponseListener({
      onOpen: (notification) => {
        setBannerNotification(null);
        void inbox.markPushNotificationAsRead(notification);
      },
      onOpenChat: (groupId) => {
        openChatFromNotification(groupId);
      },
      onOpenPoll: (pollId) => {
        openPollFromNotification(pollId);
      },
      onOpenComplaint: (complaintId) => {
        openComplaintFromNotification(complaintId);
      },
    });
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      if (
        notificationAudience &&
        !pushTypeMatchesAudience(notification.type, notificationAudience)
      ) {
        void inbox.refreshUnreadCount();
        return;
      }
      setBannerNotification(notification);
      void inbox.refreshUnreadCount();
    });
    return () => {
      openSubscription.remove();
      receivedSubscription.remove();
    };
  }, [
    user.userId,
    notificationAudience,
    openChatFromNotification,
    openPollFromNotification,
    openComplaintFromNotification,
    inbox.markPushNotificationAsRead,
    inbox.refreshUnreadCount,
  ]);

  const activeTitle = useMemo(
    () => modules.find((m) => m.routePath === activePath)?.title ?? 'Dashboard',
    [modules, activePath]
  );

  async function logout() {
    await unregisterPushNotificationsFromBackend();
    await clearSession();
    onLogout();
  }

  async function switchToOfficeView() {
    if (!canSwitchView || !memberPortal) {
      return;
    }
    await setAppViewContext('CHAIRMAN');
    setAppContextState('CHAIRMAN');
  }

  async function switchToMemberView() {
    if (!canSwitchView || memberPortal) {
      return;
    }
    await setAppViewContext('MEMBER');
    setAppContextState('MEMBER');
  }

  const displayName = userDisplayName(sessionUser);
  const portalBadge = memberPortal ? 'Member View' : formatRole(sessionUser.role);
  const headerTitle = memberPortal && displayName ? displayName : societyName;
  const avatarLabel = memberPortal && displayName ? displayName : societyName;
  const portalKicker = memberPortal
    ? displayName
      ? `${societyName} · Flat ${sessionUser.memberProfile?.flatNumber ?? '—'} · Resident access`
      : `Flat ${sessionUser.memberProfile?.flatNumber ?? '—'} · Resident access`
    : 'Financial Command';

  if (!contextReady) {
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <StatusBar style={theme.statusBar} />

      <ChatNotificationBanner
        notification={bannerNotification}
        onPress={(item) => {
          setBannerNotification(null);
          void inbox.markPushNotificationAsRead(item).then(() => {
            if (item.kind === 'poll') {
              openPollFromNotification(item.pollId);
              return;
            }
            if (item.kind === 'complaint') {
              openComplaintFromNotification(item.complaintId);
              return;
            }
            openChatFromNotification(item.groupId);
          });
        }}
        onDismiss={() => setBannerNotification(null)}
      />

      <NotificationInboxPanel
        visible={inbox.panelOpen}
        notifications={inbox.notifications}
        unreadCount={inbox.unreadCount}
        loading={inbox.loading}
        loadingMore={inbox.loadingMore}
        hasMore={inbox.hasMore}
        onClose={inbox.closePanel}
        onLoadMore={() => void inbox.loadMore()}
        onMarkAllRead={() => void inbox.handleMarkAllRead()}
        onPressNotification={(item) => {
          void inbox.handleOpenNotification(item).then((opened) => {
            if (!opened) return;
            if (opened.pollId || opened.type.startsWith('POLL')) {
              openPollFromNotification(opened.pollId);
              return;
            }
            if (opened.complaintId || opened.type.startsWith('COMPLAINT')) {
              openComplaintFromNotification(opened.complaintId);
              return;
            }
            if (opened.groupId || opened.type.startsWith('GROUP')) {
              openChatFromNotification(opened.groupId);
            }
          });
        }}
      />

      <LinearGradient colors={[...theme.headerGradient]} style={styles.hero}>
        <View style={styles.heroRow}>
          <View
            style={[
              styles.avatar,
              { borderColor: theme.accentGold, backgroundColor: theme.accentSoft },
            ]}
          >
            <Text style={styles.avatarText}>{societyInitials(avatarLabel)}</Text>
          </View>
          <View style={styles.heroText}>
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.badgeText, { color: theme.accentGold }]}>{portalBadge}</Text>
            </View>
            <Text style={styles.societyName} numberOfLines={2}>
              {headerTitle}
            </Text>
            <Text style={[styles.moduleTitle, { color: theme.accentGold }]}>{activeTitle}</Text>
          </View>
          <View style={styles.heroActions}>
            <NotificationBellButton unreadCount={inbox.unreadCount} onPress={inbox.openPanel} />
            <Pressable style={styles.iconBtn} onPress={toggleMode} accessibilityLabel="Toggle theme">
              <Text style={styles.iconBtnText}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={logout} accessibilityLabel="Log out">
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.kicker}>{portalKicker}</Text>
        {canSwitchView ? (
          <View style={styles.roleSwitcher}>
            <Pressable
              style={[
                styles.roleSegment,
                !memberPortal ? styles.roleSegmentActive : null,
                !memberPortal ? { borderColor: theme.accentGold, backgroundColor: theme.accentSoft } : null,
              ]}
              onPress={() => void switchToOfficeView()}
              accessibilityLabel="Switch to office view"
              accessibilityState={{ selected: !memberPortal }}
            >
              <Text
                style={[
                  styles.roleSegmentTitle,
                  !memberPortal ? { color: theme.accentGold } : styles.roleSegmentTitleIdle,
                ]}
              >
                Office
              </Text>
              <Text style={styles.roleSegmentHint}>{formatRole(sessionUser.role)}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.roleSegment,
                memberPortal ? styles.roleSegmentActive : null,
                memberPortal ? { borderColor: theme.accentGold, backgroundColor: theme.accentSoft } : null,
              ]}
              onPress={() => void switchToMemberView()}
              accessibilityLabel="Switch to member view"
              accessibilityState={{ selected: memberPortal }}
            >
              <Text
                style={[
                  styles.roleSegmentTitle,
                  memberPortal ? { color: theme.accentGold } : styles.roleSegmentTitleIdle,
                ]}
              >
                Member
              </Text>
              <Text style={styles.roleSegmentHint}>
                {displayName || `Flat ${sessionUser.memberProfile?.flatNumber ?? '—'}`}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.content}>
        <ModuleRouter
          routePath={activePath}
          memberPortal={memberPortal}
          userId={sessionUser.userId}
          userRole={sessionUser.role}
          initialChatGroupId={initialChatGroupId}
          onChatGroupConsumed={() => setInitialChatGroupId(null)}
          onMaintenanceConfigured={() => {
            setMaintenanceConfigured(true);
            fetchMaintenanceSettings()
              .then((settings) => setMaintenanceConfigured(settings.configured === true))
              .catch(() => undefined);
          }}
          initialPollId={initialPollId}
          onPollConsumed={() => setInitialPollId(null)}
          initialComplaintId={initialComplaintId}
          onComplaintConsumed={() => setInitialComplaintId(null)}
          onUserUpdated={(patch) => {
            handleUserUpdated(patch);
            void updateStoredUser(patch).then((next) => {
              if (next) {
                onUserUpdated?.(next);
              }
            });
          }}
          onNavigateProfile={() => setActivePath('profile')}
        />
      </View>

      <View
        style={[styles.bottomBar, { backgroundColor: theme.bottomBarBg, borderTopColor: theme.bottomBarBorder }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bottomScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {modules.map((m) => {
            const active = activePath === m.routePath;
            return (
              <Pressable
                key={m.code}
                style={[styles.tab, active ? { backgroundColor: theme.accentSoft } : null]}
                onPress={() => selectModule(m.routePath)}
              >
                <Text style={[styles.tabGlyph, active ? { color: theme.accentGold } : { color: theme.textMuted }]}>
                  {moduleGlyph(m.icon)}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    active ? { color: theme.accentGold, fontWeight: '700' } : { color: theme.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {tabLabel(m.title)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { alignItems: 'center', justifyContent: 'center' },
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
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 20 },
  roleSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  roleSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleSegmentActive: {
    borderWidth: 1,
  },
  roleSegmentTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  roleSegmentTitleIdle: {
    color: '#cbd5e1',
  },
  roleSegmentHint: {
    marginTop: 2,
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  content: { flex: 1 },
  bottomBar: {
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
  },
  bottomScrollContent: {
    paddingHorizontal: 8,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    minWidth: 72,
    maxWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 2,
  },
  tabGlyph: { fontSize: 18 },
  tabLabel: { fontSize: 10, textAlign: 'center' },
});
