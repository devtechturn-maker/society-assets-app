import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { clearSession, updateStoredUser } from '../services/storage';
import {
  canSwitchAppView,
  isMemberPortalView,
  resolveInitialAppViewContext,
  type AppViewContext,
} from '../services/appContext';
import {
  fetchMemberModules,
  fetchMemberOverview,
  fetchOverview,
  fetchSocietyModules,
  fetchTreasurerModules,
  isMemberRole,
  isTreasurerRole,
} from '../services/api';
import type { LoginData, NavModule } from '../types/api';
import { APPEARANCE_MODULE } from '../constants/appearanceModule';
import {
  FALLBACK_MEMBER_NAV_SOURCE,
  FALLBACK_SOCIETY_NAV_SOURCE,
  FALLBACK_TREASURER_NAV_SOURCE,
  prepareBottomTabModules,
  ACTIVITY_HUB_ROUTE_PATHS,
  MEMBER_SIDE_MENU_ITEMS,
  SOCIETY_SIDE_MENU_ITEMS,
} from '../constants/fallbackModules';
import { iconFromPrimeIcon, iconForRoutePath } from '../constants/uiIcons';
import { UiIcon } from '../components/UiIcon';
import type { NavPortalKind } from '../constants/activityHub';
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
  type AppPushNotification,
} from '../services/pushNotifications';
import * as Notifications from 'expo-notifications';
import { ModuleRouter } from './modules/ModuleRouter';
import { pushTypeMatchesAudience, type NotificationAudience } from '../utils/notificationAudience';
import { subscribeMemberProfileNavigation } from '../services/memberProfileNavigation';
import { useAppAlert } from '../context/AppAlertContext';
import { mergeLoginUserPatch, userDisplayName } from '../utils/userDisplayName';
import { AppLogoLoader } from '../components/AppLogoLoader';
import { ProfileSideMenu } from '../components/ProfileSideMenu';
import { SocietyJoinCodeHeader } from '../components/society/SocietyJoinCodeHeader';
import { runHardwareBackHandlers } from '../services/hardwareBackNavigation';

type Props = {
  user: LoginData;
  onLogout: () => void;
  onUserUpdated?: (user: LoginData) => void;
  onSwitchRole?: () => void;
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

export function SocietyShell({ user, onLogout, onUserUpdated, onSwitchRole }: Props) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [sessionUser, setSessionUser] = useState(user);
  const [appContext, setAppContextState] = useState<AppViewContext>('CHAIRMAN');
  const [contextReady, setContextReady] = useState(false);
  const canSwitchView = canSwitchAppView(user);
  const memberPortal = isMemberPortalView(sessionUser, appContext);
  const treasurerPortal =
    !memberPortal && isTreasurerRole(sessionUser.role ?? user.role ?? '');
  const navPortal: NavPortalKind = memberPortal ? 'member' : treasurerPortal ? 'treasurer' : 'society';
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
  const [modules, setModules] = useState<NavModule[]>(() =>
    prepareBottomTabModules(
      memberPortal
        ? [...FALLBACK_MEMBER_NAV_SOURCE]
        : treasurerPortal
          ? [...FALLBACK_TREASURER_NAV_SOURCE, APPEARANCE_MODULE]
          : [...FALLBACK_SOCIETY_NAV_SOURCE, APPEARANCE_MODULE],
      navPortal
    )
  );
  const [activePath, setActivePath] = useState('dashboard');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const activePathRef = useRef(activePath);
  const lastTabPathRef = useRef('dashboard');

  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  const [societyName, setSocietyName] = useState('Society');
  const [initialChatGroupId, setInitialChatGroupId] = useState<string | null>(null);
  const [initialPollId, setInitialPollId] = useState<string | null>(null);
  const [initialComplaintId, setInitialComplaintId] = useState<string | null>(null);
  const [initialRuleId, setInitialRuleId] = useState<string | null>(null);
  const [initialNoticeId, setInitialNoticeId] = useState<string | null>(null);
  const [initialBookingId, setInitialBookingId] = useState<string | null>(null);
  const [bannerNotification, setBannerNotification] = useState<AppPushNotification | null>(null);
  const inbox = useNotificationInbox(user.userId, notificationAudience);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (runHardwareBackHandlers()) {
        return true;
      }
      if (sideMenuOpen) {
        setSideMenuOpen(false);
        return true;
      }
      if (inbox.panelOpen) {
        inbox.closePanel();
        return true;
      }
      if (ACTIVITY_HUB_ROUTE_PATHS.has(activePathRef.current)) {
        setActivePath('activity');
        lastTabPathRef.current = 'activity';
        return true;
      }
      if (activePathRef.current === 'activity') {
        setActivePath('dashboard');
        lastTabPathRef.current = 'dashboard';
        return true;
      }
      if (activePathRef.current !== 'dashboard') {
        setActivePath('dashboard');
        lastTabPathRef.current = 'dashboard';
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [sideMenuOpen, inbox.panelOpen, inbox.closePanel]);

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
      lastTabPathRef.current = 'dashboard';
      setActivePath('profile');
    }
  }, [contextReady, memberPortal, sessionUser.role, sessionUser.emailVerified]);

  useEffect(() => {
    if (!memberPortal) {
      return;
    }
    return subscribeMemberProfileNavigation(() => {
      lastTabPathRef.current = activePathRef.current;
      setActivePath('profile');
      toast('Please verify your email first.', 'error');
    });
  }, [memberPortal, toast]);

  const loadMeta = useCallback(async () => {
    try {
      if (memberPortal) {
        const [mods, overview] = await Promise.all([fetchMemberModules(), fetchMemberOverview()]);
        const merged = prepareBottomTabModules(mods, 'member');
        if (merged.length > 0) setModules(merged);
        if (overview.societyName) setSocietyName(overview.societyName);
        return;
      }
      if (treasurerPortal) {
        const [mods, overview] = await Promise.all([fetchTreasurerModules(), fetchOverview()]);
        const merged = prepareBottomTabModules([...mods, APPEARANCE_MODULE], 'treasurer');
        if (merged.length > 0) setModules(merged);
        if (overview.societyName) setSocietyName(overview.societyName);
        return;
      }
      const [mods, overview] = await Promise.all([fetchSocietyModules(), fetchOverview()]);
      const merged = prepareBottomTabModules([...mods, APPEARANCE_MODULE], 'society');
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
  }, [memberPortal, treasurerPortal, navPortal]);

  useEffect(() => {
    if (!contextReady) {
      return;
    }
    loadMeta();
  }, [loadMeta, contextReady]);

  useEffect(() => {
    setModules(
      prepareBottomTabModules(
        memberPortal
          ? [...FALLBACK_MEMBER_NAV_SOURCE]
          : treasurerPortal
            ? [...FALLBACK_TREASURER_NAV_SOURCE, APPEARANCE_MODULE]
            : [...FALLBACK_SOCIETY_NAV_SOURCE, APPEARANCE_MODULE],
        navPortal
      )
    );
    setActivePath('dashboard');
    setSideMenuOpen(false);
    lastTabPathRef.current = 'dashboard';
  }, [memberPortal, treasurerPortal, navPortal]);

  const openChatFromNotification = useCallback((groupId?: string) => {
    setActivePath('chat');
    if (groupId) {
      setInitialChatGroupId(groupId);
    }
  }, []);

  const openPollFromNotification = useCallback((pollId?: string, groupId?: string) => {
    setActivePath('chat');
    if (groupId) {
      setInitialChatGroupId(groupId);
    }
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

  const openRuleFromNotification = useCallback((ruleId?: string) => {
    setActivePath('about-society');
    if (ruleId) {
      setInitialRuleId(ruleId);
    }
  }, []);

  const openNoticeFromNotification = useCallback((noticeId?: string) => {
    setActivePath('notices');
    lastTabPathRef.current = 'notices';
    if (noticeId) {
      setInitialNoticeId(noticeId);
    }
  }, []);

  const openAmenityFromNotification = useCallback((bookingId?: string) => {
    setActivePath('amenities');
    if (bookingId) {
      setInitialBookingId(bookingId);
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
        openPollFromNotification(parsed.pollId, parsed.groupId);
        return;
      }
      if (parsed.kind === 'complaint') {
        openComplaintFromNotification(parsed.complaintId);
        return;
      }
      if (parsed.kind === 'amenity') {
        openAmenityFromNotification(parsed.bookingId);
        return;
      }
      if (parsed.kind === 'rule') {
        openRuleFromNotification(parsed.ruleId);
        return;
      }
      if (parsed.kind === 'notice') {
        openNoticeFromNotification(parsed.noticeId);
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
      onOpenPoll: (pollId, groupId) => {
        openPollFromNotification(pollId, groupId);
      },
      onOpenComplaint: (complaintId) => {
        openComplaintFromNotification(complaintId);
      },
      onOpenAmenity: (bookingId) => {
        openAmenityFromNotification(bookingId);
      },
      onOpenRule: (ruleId) => {
        openRuleFromNotification(ruleId);
      },
      onOpenNotice: (noticeId) => {
        openNoticeFromNotification(noticeId);
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
    openRuleFromNotification,
    openNoticeFromNotification,
    openAmenityFromNotification,
    inbox.markPushNotificationAsRead,
    inbox.refreshUnreadCount,
  ]);

  async function logout() {
    onLogout();
  }

  const toggleSideMenu = useCallback(() => {
    setSideMenuOpen((open) => !open);
  }, []);

  const openSideMenuRoute = useCallback((routePath: string) => {
    if (routePath === '__switch_role__') {
      setSideMenuOpen(false);
      onSwitchRole?.();
      return;
    }
    const sideRoutes = new Set(['profile', 'appearance', 'about-us', 'about-society', 'help', 'subscription']);
    if (!sideRoutes.has(activePathRef.current)) {
      lastTabPathRef.current = activePathRef.current;
    }
    setActivePath(routePath);
    setSideMenuOpen(false);
  }, [onSwitchRole]);

  const sideMenuItems = useMemo(() => {
    const base = memberPortal ? MEMBER_SIDE_MENU_ITEMS : SOCIETY_SIDE_MENU_ITEMS;
    if (canSwitchView && onSwitchRole) {
      return [
        { label: 'Switch role', routePath: '__switch_role__', icon: 'pi pi-sync' },
        ...base,
      ];
    }
    return base;
  }, [memberPortal, canSwitchView, onSwitchRole]);

  const openProfileScreen = useCallback(() => {
    openSideMenuRoute(memberPortal ? 'profile' : 'appearance');
  }, [memberPortal, openSideMenuRoute]);

  const navigateFromActivity = useCallback((routePath: string) => {
    setSideMenuOpen(false);
    lastTabPathRef.current = 'activity';
    setActivePath(routePath);
  }, []);

  const selectTab = useCallback((routePath: string) => {
    setSideMenuOpen(false);
    setActivePath(routePath);
    lastTabPathRef.current = routePath;
  }, []);

  if (!contextReady) {
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: theme.pageBg }]}>
        <AppLogoLoader size="lg" tone="onLight" label="Loading your society…" />
      </View>
    );
  }

  const avatarLabel = userDisplayName(sessionUser) || societyName;

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <StatusBar style={theme.statusBar} />

      <ChatNotificationBanner
        notification={bannerNotification}
        onPress={(item) => {
          setBannerNotification(null);
          void inbox.markPushNotificationAsRead(item).then(() => {
            if (item.kind === 'poll') {
              openPollFromNotification(item.pollId, item.groupId);
              return;
            }
            if (item.kind === 'complaint') {
              openComplaintFromNotification(item.complaintId);
              return;
            }
            if (item.kind === 'amenity') {
              openAmenityFromNotification(item.bookingId);
              return;
            }
            if (item.kind === 'rule') {
              openRuleFromNotification(item.ruleId);
              return;
            }
            if (item.kind === 'notice') {
              openNoticeFromNotification(item.noticeId);
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
              openPollFromNotification(opened.pollId, opened.groupId);
              return;
            }
            if (opened.complaintId || opened.type.startsWith('COMPLAINT')) {
              openComplaintFromNotification(opened.complaintId);
              return;
            }
            if (opened.amenityBookingId || opened.type.startsWith('AMENITY')) {
              openAmenityFromNotification(opened.amenityBookingId);
              return;
            }
            if (opened.ruleId || opened.type.startsWith('RULE')) {
              openRuleFromNotification(opened.ruleId);
              return;
            }
            if (opened.noticeId || opened.type.startsWith('NOTICE')) {
              openNoticeFromNotification(opened.noticeId);
              return;
            }
            if (opened.groupId || opened.type.startsWith('GROUP')) {
              openChatFromNotification(opened.groupId);
            }
          });
        }}
      />

      <ProfileSideMenu
        visible={sideMenuOpen}
        items={sideMenuItems}
        activePath={activePath}
        societyName={societyName}
        onClose={() => setSideMenuOpen(false)}
        onSelect={openSideMenuRoute}
        onLogout={() => void logout()}
      />

      <LinearGradient colors={[...theme.headerGradient]} style={styles.hero}>
        <View style={styles.heroRow}>
          <Pressable
            onPress={toggleSideMenu}
            accessibilityLabel="Open menu"
            style={({ pressed }) => [styles.heroSide, pressed ? styles.avatarPressed : null]}
          >
            <View
              style={[
                styles.avatar,
                { borderColor: theme.accentGold, backgroundColor: theme.accentSoft },
              ]}
            >
              <Text style={styles.avatarText}>{societyInitials(avatarLabel)}</Text>
            </View>
          </Pressable>
          <View style={styles.heroCenter}>
            <AppLogo variant="glyph" size={34} framed />
          </View>
          <View style={[styles.heroSide, styles.heroActions]}>
            <NotificationBellButton unreadCount={inbox.unreadCount} onPress={inbox.openPanel} />
          </View>
        </View>
        <Text style={styles.kicker}>
          {memberPortal
            ? `${societyName} · Flat ${sessionUser.memberProfile?.flatNumber ?? '—'}`
            : societyName}
        </Text>
        {!memberPortal ? <SocietyJoinCodeHeader /> : null}
      </LinearGradient>

      <View style={styles.content}>
        <ModuleRouter
          routePath={activePath}
          memberPortal={memberPortal}
          userId={sessionUser.userId}
          userRole={sessionUser.role}
          initialChatGroupId={initialChatGroupId}
          onChatGroupConsumed={() => setInitialChatGroupId(null)}
          initialPollId={initialPollId}
          onPollConsumed={() => setInitialPollId(null)}
          initialComplaintId={initialComplaintId}
          onComplaintConsumed={() => setInitialComplaintId(null)}
          initialRuleId={initialRuleId}
          onRuleConsumed={() => setInitialRuleId(null)}
          initialNoticeId={initialNoticeId}
          onNoticeConsumed={() => setInitialNoticeId(null)}
          initialBookingId={initialBookingId}
          onBookingConsumed={() => setInitialBookingId(null)}
          onUserUpdated={(patch) => {
            handleUserUpdated(patch);
            void updateStoredUser(patch).then((next) => {
              if (next) {
                onUserUpdated?.(next);
              }
            });
          }}
          onNavigateProfile={openProfileScreen}
          onOpenNotice={(noticeId) => openNoticeFromNotification(noticeId)}
          onLogout={() => void logout()}
          onNavigateFromActivity={navigateFromActivity}
          navPortal={navPortal}
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
            const active =
              m.routePath === 'activity'
                ? activePath === 'activity' || ACTIVITY_HUB_ROUTE_PATHS.has(activePath)
                : activePath === m.routePath;
            const tabIconColor = active ? theme.accentGold : theme.textMuted;
            const tabIconName =
              m.routePath === 'activity' ? 'grid' : iconFromPrimeIcon(m.icon) || iconForRoutePath(m.routePath);
            return (
              <Pressable
                key={m.code}
                style={[styles.tab, active ? { backgroundColor: theme.accentSoft } : null]}
                onPress={() => selectTab(m.routePath)}
              >
                <UiIcon name={tabIconName} size={22} color={tabIconColor} />
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
  boot: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  hero: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: { opacity: 0.85 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  kicker: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  content: { flex: 1 },
  bottomBar: {
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        paddingBottom: 16,
        paddingTop: 10,
      },
    }),
  },
  bottomScrollContent: {
    paddingHorizontal: 8,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    ...Platform.select({
      ios: {
        paddingBottom: 2,
      },
    }),
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
    ...Platform.select({
      ios: {
        paddingVertical: 8,
        minHeight: 52,
      },
    }),
  },
  tabGlyph: { fontSize: 18 },
  tabLabel: { fontSize: 10, textAlign: 'center' },
});
