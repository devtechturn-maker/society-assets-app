import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
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
  FALLBACK_TREASURER_NAV_SOURCE,
  prepareBottomTabModules,
  splitTabBarModules,
  buildMoreMenuItems,
  ACTIVITY_HUB_ROUTE_PATHS,
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
import { AppLoader } from '../components/AppLoader';
import { useGlobalLoadingVisible } from '../hooks/useGlobalLoadingVisible';
import { MoreBottomMenu } from '../components/MoreBottomMenu';
import { SocietyJoinCodeHeader } from '../components/society/SocietyJoinCodeHeader';
import { runHardwareBackHandlers } from '../services/hardwareBackNavigation';
import { ModuleRouter } from './modules/ModuleRouter';

type Props = {
  user: LoginData;
  onLogout: () => void;
  onUserUpdated?: (user: LoginData) => void;
  onSwitchRole?: () => void;
};

function tabLabel(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 11) return trimmed;
  return `${trimmed.slice(0, 10)}…`;
}

function SocietyBootLoader() {
  const globalVisible = useGlobalLoadingVisible();
  if (globalVisible) {
    return null;
  }
  return <AppLoader size="lg" label="Loading your society…" />;
}

export function SocietyShell({ user, onLogout, onUserUpdated, onSwitchRole }: Props) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [sessionUser, setSessionUser] = useState(user);
  const [appContext, setAppContextState] = useState<AppViewContext>('CHAIRMAN');
  const [contextReady, setContextReady] = useState(false);
  const canSwitchView = canSwitchAppView(sessionUser);
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(72);
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
      if (moreMenuOpen) {
        setMoreMenuOpen(false);
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
  }, [moreMenuOpen, inbox.panelOpen, inbox.closePanel]);

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
    // Belt-and-suspenders: App root gates unverified members; keep soft redirect if session is stale.
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
    setMoreMenuOpen(false);
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

  const openMoreMenuRoute = useCallback((routePath: string) => {
    if (routePath === '__switch_role__') {
      setMoreMenuOpen(false);
      onSwitchRole?.();
      return;
    }
    const primary = new Set(
      memberPortal
        ? ['dashboard', 'activity', 'chat']
        : gatekeeperPortal
          ? ['dashboard', 'visitor-entry', 'visitor-history']
          : treasurerPortal
            ? ['dashboard', 'activity', 'ledger']
            : ['dashboard', 'activity', 'chat']
    );
    if (primary.has(activePathRef.current) || activePathRef.current === 'activity') {
      lastTabPathRef.current = activePathRef.current;
    } else if (!primary.has(activePathRef.current)) {
      // Keep last primary tab when opening a More destination
      if (primary.has(lastTabPathRef.current) === false) {
        lastTabPathRef.current = 'dashboard';
      }
    }
    setActivePath(routePath);
    setMoreMenuOpen(false);
  }, [gatekeeperPortal, memberPortal, treasurerPortal, onSwitchRole]);

  const moreMenuItems = useMemo(() => {
    const switchRoleLabel =
      canSwitchView && onSwitchRole
        ? memberPortal
          ? 'Switch to Chairman View'
          : 'Switch to Member View'
        : undefined;
    return buildMoreMenuItems(modules, navPortal, { switchRoleLabel });
  }, [modules, navPortal, canSwitchView, onSwitchRole, memberPortal]);

  const selectTab = useCallback((routePath: string) => {
    setMoreMenuOpen(false);
    setActivePath(routePath);
    lastTabPathRef.current = routePath;
  }, []);

  const openProfileScreen = useCallback(() => {
    openMoreMenuRoute(memberPortal ? 'profile' : gatekeeperPortal ? 'profile' : 'appearance');
  }, [gatekeeperPortal, memberPortal, openMoreMenuRoute]);

  const { scrollableTabs, profileTab: moreTab } = useMemo(
    () => splitTabBarModules(modules, navPortal),
    [modules, navPortal]
  );

  const moreRelatedRoutes = useMemo(
    () =>
      new Set(
        moreMenuItems
          .map((item) => item.routePath)
          .filter((routePath) => routePath !== '__switch_role__')
      ),
    [moreMenuItems]
  );
  const moreTabActive = moreMenuOpen || moreRelatedRoutes.has(activePath);

  const toggleMoreMenu = useCallback(() => {
    if (!moreMenuOpen && !moreRelatedRoutes.has(activePathRef.current)) {
      lastTabPathRef.current = activePathRef.current;
    }
    setMoreMenuOpen((open) => !open);
  }, [moreRelatedRoutes, moreMenuOpen]);

  const navigateFromActivity = useCallback((routePath: string) => {
    setMoreMenuOpen(false);
    lastTabPathRef.current = 'activity';
    setActivePath(routePath);
  }, []);

  if (!contextReady) {
    // Prefer the single global overlay when APIs are in flight; otherwise show one local boot loader.
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: theme.pageBg }]}>
        <SocietyBootLoader />
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

      <MoreBottomMenu
        visible={moreMenuOpen}
        items={moreMenuItems}
        activePath={activePath}
        bottomOffset={bottomBarHeight}
        onClose={() => setMoreMenuOpen(false)}
        onSelect={openMoreMenuRoute}
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
              ? `Member Mode · ${societyName} · Flat ${sessionUser.memberProfile?.flatNumber ?? '—'}`
              : canSwitchView
                ? `Chairman Mode · ${societyName}`
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
          onNavigateSideRoute={openMoreMenuRoute}
          profileDisplayName={avatarLabel}
          societyName={societyName}
          navPortal={navPortal}
        />
      </View>

      <View
        style={[styles.bottomBar, { backgroundColor: theme.bottomBarBg, borderTopColor: theme.bottomBarBorder }]}
        onLayout={(event) => {
          const next = Math.ceil(event.nativeEvent.layout.height);
          if (next > 0 && next !== bottomBarHeight) {
            setBottomBarHeight(next);
          }
        }}
      >
        <View style={styles.bottomBarRow}>
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

          <Pressable
            style={({ pressed }) => [
              styles.tab,
              moreTabActive ? [styles.tabActivePill, { backgroundColor: theme.accentSoft }] : null,
              pressed ? styles.tabPressed : null,
            ]}
            onPress={toggleMoreMenu}
            accessibilityLabel={moreMenuOpen ? 'Close more menu' : 'Open more menu'}
            accessibilityState={{ expanded: moreMenuOpen }}
          >
            <View style={styles.tabIconWrap}>
              <UiIcon
                name="more"
                size={20}
                color={moreTabActive ? theme.accentGold : theme.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                moreTabActive
                  ? { color: theme.accentGold, fontWeight: '700' }
                  : { color: theme.textMuted },
              ]}
              numberOfLines={1}
            >
              {tabLabel(moreTab.title)}
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
    zIndex: 30,
    elevation: 30,
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
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 3,
  },
  tabActivePill: {
    borderRadius: 14,
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
