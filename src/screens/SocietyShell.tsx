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
  fetchGatekeeperModules,
  fetchGateKeeperDashboard,
  isMemberRole,
  isTreasurerRole,
  isGateKeeperRole,
} from '../services/api';
import type { AppNotification, LoginData, NavModule } from '../types/api';
import { APPEARANCE_MODULE } from '../constants/appearanceModule';
import {
  FALLBACK_MEMBER_NAV_SOURCE,
  FALLBACK_SOCIETY_NAV_SOURCE,
  FALLBACK_GATEKEEPER_NAV_SOURCE,
  GATEKEEPER_SIDE_MENU_ITEMS,
  FALLBACK_TREASURER_NAV_SOURCE,
  prepareBottomTabModules,
  splitTabBarModules,
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
import { pushTypeMatchesAudience, type NotificationAudience } from '../utils/notificationAudience';
import { subscribeMemberProfileNavigation } from '../services/memberProfileNavigation';
import { useAppAlert } from '../context/AppAlertContext';
import { mergeLoginUserPatch, userDisplayName } from '../utils/userDisplayName';
import { AppLogo } from '../components/AppLogo';
import { AppLogoLoader } from '../components/AppLogoLoader';
import { ProfileSideMenu } from '../components/ProfileSideMenu';
import { SocietyJoinCodeHeader } from '../components/society/SocietyJoinCodeHeader';
import { runHardwareBackHandlers } from '../services/hardwareBackNavigation';
import { ModuleRouter } from './modules/ModuleRouter';

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
  const gatekeeperPortal = isGateKeeperRole(sessionUser.role ?? user.role ?? '');
  const memberPortal = !gatekeeperPortal && isMemberPortalView(sessionUser, appContext);
  const treasurerPortal =
    !memberPortal && isTreasurerRole(sessionUser.role ?? user.role ?? '');
  const navPortal: NavPortalKind = gatekeeperPortal
    ? 'gatekeeper'
    : memberPortal
      ? 'member'
      : treasurerPortal
        ? 'treasurer'
        : 'society';
  const notificationAudience = useMemo((): NotificationAudience | null => {
    if (gatekeeperPortal) {
      return 'GATEKEEPER';
    }
    if (canSwitchView) {
      return appContext;
    }
    if (isMemberRole(user.role)) {
      return 'MEMBER';
    }
    return null;
  }, [canSwitchView, gatekeeperPortal, sessionUser.role, appContext]);

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
  const [initialVisitorId, setInitialVisitorId] = useState<string | null>(null);
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
      if (gatekeeperPortal) {
        const [mods, dashboard] = await Promise.all([fetchGatekeeperModules(), fetchGateKeeperDashboard()]);
        const merged = prepareBottomTabModules(mods, 'gatekeeper');
        if (merged.length > 0) setModules(merged);
        if (dashboard.societyName) setSocietyName(dashboard.societyName);
        return;
      }
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
  }, [gatekeeperPortal, memberPortal, treasurerPortal, navPortal]);

  useEffect(() => {
    if (!contextReady) {
      return;
    }
    loadMeta();
  }, [loadMeta, contextReady]);

  useEffect(() => {
    setModules(
      prepareBottomTabModules(
        gatekeeperPortal
          ? [...FALLBACK_GATEKEEPER_NAV_SOURCE]
          : memberPortal
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
  }, [gatekeeperPortal, memberPortal, treasurerPortal, navPortal]);

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

  const openVisitorFromNotification = useCallback(
    (visitorId?: string, type?: AppPushNotification['type']) => {
      if (!visitorId) {
        return;
      }
      if (gatekeeperPortal) {
        setActivePath('visitor-history');
        setInitialVisitorId(visitorId);
        return;
      }
      setActivePath('visitors');
      setInitialVisitorId(visitorId);
    },
    [gatekeeperPortal]
  );

  const openVisitorsScreen = useCallback((visitorId?: string) => {
    lastTabPathRef.current = 'dashboard';
    setActivePath('visitors');
    if (visitorId) {
      setInitialVisitorId(visitorId);
    }
  }, []);

  const handleNotificationPress = useCallback(
    (item: AppNotification) => {
      void inbox.handleOpenNotification(item).then((opened) => {
        if (!opened) {
          return;
        }
        if (gatekeeperPortal) {
          if (opened.visitorId || opened.type.startsWith('VISITOR')) {
            openVisitorFromNotification(opened.visitorId, opened.type as AppPushNotification['type']);
          }
          return;
        }
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
        if (opened.visitorId || opened.type.startsWith('VISITOR')) {
          openVisitorFromNotification(opened.visitorId, opened.type as AppPushNotification['type']);
          return;
        }
        if (opened.groupId || opened.type.startsWith('GROUP')) {
          openChatFromNotification(opened.groupId);
        }
      });
    },
    [
      gatekeeperPortal,
      inbox.handleOpenNotification,
      openAmenityFromNotification,
      openChatFromNotification,
      openComplaintFromNotification,
      openNoticeFromNotification,
      openPollFromNotification,
      openRuleFromNotification,
      openVisitorFromNotification,
    ]
  );

  useEffect(() => {
    inbox.setListActive(inbox.panelOpen);
  }, [inbox.panelOpen, inbox.setListActive]);

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
      if (parsed.kind === 'visitor') {
        openVisitorFromNotification(parsed.visitorId, parsed.type);
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
      onOpenVisitor: (visitorId, type) => {
        openVisitorFromNotification(visitorId, type);
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
    openVisitorFromNotification,
    inbox.markPushNotificationAsRead,
    inbox.refreshUnreadCount,
  ]);

  async function logout() {
    onLogout();
  }

  const openSideMenuRoute = useCallback((routePath: string) => {
    if (routePath === '__switch_role__') {
      setSideMenuOpen(false);
      onSwitchRole?.();
      return;
    }
    const sideRoutes = new Set([
      'profile',
      'appearance',
      'about-us',
      ...(gatekeeperPortal ? [] : ['about-society']),
      'help',
      'subscription',
    ]);
    if (!sideRoutes.has(activePathRef.current)) {
      lastTabPathRef.current = activePathRef.current;
    }
    setActivePath(routePath);
    setSideMenuOpen(false);
  }, [gatekeeperPortal, onSwitchRole]);

  const sideMenuItems = useMemo(() => {
    if (gatekeeperPortal) {
      return [...GATEKEEPER_SIDE_MENU_ITEMS];
    }
    const base = memberPortal ? MEMBER_SIDE_MENU_ITEMS : SOCIETY_SIDE_MENU_ITEMS;
    if (canSwitchView && onSwitchRole) {
      return [
        { label: 'Switch role', routePath: '__switch_role__', icon: 'pi pi-sync' },
        ...base,
      ];
    }
    return base;
  }, [gatekeeperPortal, memberPortal, canSwitchView, onSwitchRole]);

  const selectTab = useCallback((routePath: string) => {
    setSideMenuOpen(false);
    setActivePath(routePath);
    lastTabPathRef.current = routePath;
  }, []);

  const openProfileScreen = useCallback(() => {
    openSideMenuRoute(memberPortal ? 'profile' : gatekeeperPortal ? 'profile' : 'appearance');
  }, [gatekeeperPortal, memberPortal, openSideMenuRoute]);

  const { scrollableTabs, profileTab } = useMemo(
    () => splitTabBarModules(modules, navPortal),
    [modules, navPortal]
  );

  const profileRoute = profileTab.routePath;
  const profileRelatedRoutes = useMemo(
    () =>
      new Set([
        profileRoute,
        'about-us',
        ...(gatekeeperPortal ? [] : ['about-society']),
        'help',
        'subscription',
      ]),
    [gatekeeperPortal, profileRoute]
  );
  const profileTabActive = sideMenuOpen || profileRelatedRoutes.has(activePath);

  const toggleProfileMenu = useCallback(() => {
    if (!sideMenuOpen && !profileRelatedRoutes.has(activePathRef.current)) {
      lastTabPathRef.current = activePathRef.current;
    }
    setSideMenuOpen((open) => !open);
  }, [profileRelatedRoutes, sideMenuOpen]);

  const navigateFromActivity = useCallback((routePath: string) => {
    setSideMenuOpen(false);
    lastTabPathRef.current = 'activity';
    setActivePath(routePath);
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
            if (item.kind === 'visitor') {
              openVisitorFromNotification(item.visitorId, item.type);
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
        onPressNotification={handleNotificationPress}
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
          <View style={styles.heroBrand}>
            <AppLogo variant="glyph" size={34} framed />
          </View>
          <View style={styles.heroTrailing}>
            <NotificationBellButton unreadCount={inbox.unreadCount} onPress={inbox.openPanel} />
          </View>
        </View>
        <Text style={styles.kicker}>
          {gatekeeperPortal
            ? `Gate Security · ${societyName}`
            : memberPortal
              ? `${societyName} · Flat ${sessionUser.memberProfile?.flatNumber ?? '—'}`
              : societyName}
        </Text>
        {!memberPortal && !gatekeeperPortal ? <SocietyJoinCodeHeader /> : null}
      </LinearGradient>

      <View style={styles.content}>
        <ModuleRouter
          routePath={activePath}
          memberPortal={memberPortal}
          gatekeeperPortal={gatekeeperPortal}
          societyId={sessionUser.societyId}
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
          initialVisitorId={initialVisitorId}
          onVisitorConsumed={() => setInitialVisitorId(null)}
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
          onOpenVisitors={openVisitorsScreen}
          onLogout={() => void logout()}
          onNavigateFromActivity={navigateFromActivity}
          onNavigateSideRoute={openSideMenuRoute}
          profileDisplayName={avatarLabel}
          societyName={societyName}
          navPortal={navPortal}
        />
      </View>

      <View
        style={[styles.bottomBar, { backgroundColor: theme.bottomBarBg, borderTopColor: theme.bottomBarBorder }]}
      >
        <View style={styles.bottomBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bottomScrollWrap}
            contentContainerStyle={styles.bottomScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {scrollableTabs.map((m) => {
              const active =
                m.routePath === 'activity'
                  ? activePath === 'activity' || ACTIVITY_HUB_ROUTE_PATHS.has(activePath)
                  : activePath === m.routePath;
              const tabIconColor = active ? theme.accentGold : theme.textMuted;
              const tabIconName =
                m.routePath === 'activity'
                  ? 'grid'
                  : iconFromPrimeIcon(m.icon) || iconForRoutePath(m.routePath);
              return (
                <Pressable
                  key={m.code}
                  style={({ pressed }) => [
                    styles.tab,
                    active ? [styles.tabActivePill, { backgroundColor: theme.accentSoft }] : null,
                    pressed ? styles.tabPressed : null,
                  ]}
                  onPress={() => selectTab(m.routePath)}
                >
                  <View style={styles.tabIconWrap}>
                    <UiIcon name={tabIconName} size={22} color={tabIconColor} />
                  </View>
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

          <Pressable
            style={({ pressed }) => [
              styles.tab,
              styles.profileTab,
              profileTabActive ? [styles.tabActivePill, { backgroundColor: theme.accentSoft }] : null,
              { borderLeftColor: theme.bottomBarBorder },
              pressed ? styles.tabPressed : null,
            ]}
            onPress={toggleProfileMenu}
            accessibilityLabel="Open profile menu"
          >
            <View
              style={[
                styles.profileTabAvatar,
                {
                  borderColor: profileTabActive ? theme.accentGold : theme.cardBorder,
                  backgroundColor: profileTabActive ? theme.accentSoft : theme.chipBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.profileTabAvatarText,
                  { color: profileTabActive ? theme.accentGold : theme.textMuted },
                ]}
              >
                {societyInitials(avatarLabel)}
              </Text>
            </View>
            <Text
              style={[
                styles.tabLabel,
                profileTabActive
                  ? { color: theme.accentGold, fontWeight: '700' }
                  : { color: theme.textMuted },
              ]}
              numberOfLines={1}
            >
              {tabLabel(profileTab.title)}
            </Text>
          </Pressable>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  hero: {
    paddingTop: 48,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#16061c',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBrand: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPressed: { opacity: 0.85 },
  kicker: {
    color: 'rgba(243, 232, 251, 0.78)',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.7,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: { flex: 1 },
  bottomBar: {
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        paddingBottom: 18,
        paddingTop: 10,
      },
    }),
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bottomScrollWrap: {
    flex: 1,
  },
  bottomScrollContent: {
    paddingHorizontal: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    ...Platform.select({
      ios: {
        paddingBottom: 2,
      },
    }),
  },
  profileTab: {
    borderLeftWidth: 1,
    minWidth: 80,
    maxWidth: 96,
  },
  profileTabAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tab: {
    minWidth: 76,
    maxWidth: 104,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 3,
  },
  tabActivePill: {
    borderRadius: 999,
  },
  tabPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  tabGlyph: { fontSize: 18 },
  tabLabel: { fontSize: 10, textAlign: 'center', letterSpacing: 0.15 },
});
