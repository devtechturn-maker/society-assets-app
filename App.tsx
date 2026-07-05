import { useCallback, useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppBootLoader } from './src/components/AppLogoLoader';
import { GlobalLoadingOverlay } from './src/components/GlobalLoadingOverlay';
import { FirstLoginPasswordScreen } from './src/screens/FirstLoginPasswordScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlansScreen } from './src/screens/PlansScreen';
import { SocietyShell } from './src/screens/SocietyShell';
import { SplashScreen } from './src/screens/SplashScreen';
import { PlanPurchaseScreen } from './src/screens/PlanPurchaseScreen';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { loadStoredSession, setSessionInvalidHandler } from './src/services/session';
import { fetchSubscriptionStatus } from './src/services/api';
import { performAppLogout } from './src/services/authLogout';
import { getAppViewContext, canSwitchLoginRole, requiresRoleSelection, clearAppViewContext } from './src/services/appContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { LoginData, SocietySubscriptionStatus } from './src/types/api';
import {
  configurePushNotifications,
  isRemotePushAvailable,
} from './src/services/pushNotifications';
import { preloadBrandAssets } from './src/utils/preloadBrandAssets';

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

if (__DEV__) {
  LogBox.ignoreLogs([
    '`expo-notifications` functionality is not fully supported in Expo Go',
    'VirtualizedList: You have a large list that is slow to update',
  ]);
}

/** Bumps on every Metro full reload so splash state resets (not on Fast Refresh). */
let appLaunchGeneration = 0;
appLaunchGeneration += 1;

type GuestScreen = 'login' | 'plans' | 'forgot-password';

function AppRoot() {
  const { theme } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [guestScreen, setGuestScreen] = useState<GuestScreen>('login');
  const [user, setUser] = useState<LoginData | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SocietySubscriptionStatus | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [pendingRoleSelection, setPendingRoleSelection] = useState(false);

  const appReady = sessionReady && assetsReady;

  const finishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    preloadBrandAssets()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setAssetsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isRemotePushAvailable()) {
      configurePushNotifications();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadStoredSession()
      .then(async (u) => {
        if (cancelled) {
          return;
        }
        if (u?.token) {
          try {
            const sub = await fetchSubscriptionStatus();
            if (!cancelled) {
              setSubscriptionStatus(sub);
              setUser(u);
              const storedContext = await getAppViewContext();
              setPendingRoleSelection(requiresRoleSelection(u) && !storedContext);
            }
          } catch {
            if (!cancelled) {
              setUser(u);
              const storedContext = await getAppViewContext();
              setPendingRoleSelection(requiresRoleSelection(u) && !storedContext);
              setSubscriptionStatus({
                status: 'EXPIRED',
                canAccessApp: false,
                renewRequired: true,
                message: 'Could not verify subscription.',
              });
            }
          }
        } else {
          setUser(null);
        }
        if (!cancelled) {
          setSessionReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setSessionReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionInvalidHandler(() => {
      setUser(null);
      setSubscriptionStatus(null);
      setPendingRoleSelection(false);
      setGuestScreen('login');
    });
    return () => setSessionInvalidHandler(null);
  }, []);

  async function handleLoggedIn(data: LoginData) {
    if (data.subscription && !data.subscription.canAccessApp) {
      setUser(data);
      setSubscriptionStatus(data.subscription);
      return;
    }
    try {
      const sub = await fetchSubscriptionStatus();
      setSubscriptionStatus(sub);
      if (!sub.canAccessApp) {
        setUser(data);
        return;
      }
    } catch {
      setSubscriptionStatus({
        status: 'EXPIRED',
        canAccessApp: false,
        renewRequired: true,
        message: 'Could not verify subscription.',
      });
      setUser(data);
      return;
    }
    setUser(data);
    setSubscriptionStatus(null);
    setPendingRoleSelection(requiresRoleSelection(data));
  }

  async function handleLogout() {
    await performAppLogout();
    setUser(null);
    setSubscriptionStatus(null);
    setPendingRoleSelection(false);
    setGuestScreen('login');
    setShowSplash(true);
  }

  function handleSwitchRole() {
    setPendingRoleSelection(true);
  }

  if (showSplash || !assetsReady) {
    return <SplashScreen onFinish={finishSplash} appReady={appReady} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      {!sessionReady ? (
        <AppBootLoader backgroundColor={theme.splashBg} label="Loading…" />
      ) : user && subscriptionStatus && !subscriptionStatus.canAccessApp ? (
        <PlanPurchaseScreen
          status={subscriptionStatus}
          societyId={user.societyId}
          onLogout={handleLogout}
          onRefreshStatus={fetchSubscriptionStatus}
          onActivated={(next) => {
            setSubscriptionStatus(next.canAccessApp ? null : next);
          }}
        />
      ) : user && user.firstLogin ? (
        <FirstLoginPasswordScreen
          user={user}
          onPasswordChanged={(updated) => {
            setUser(updated);
          }}
        />
      ) : user && pendingRoleSelection ? (
        <RoleSelectionScreen
          user={user}
          onSelected={() => setPendingRoleSelection(false)}
          onUserUpdated={(data) => {
            void clearAppViewContext().then(() => {
              setUser(data);
              setPendingRoleSelection(requiresRoleSelection(data));
            });
          }}
          onLogout={handleLogout}
        />
      ) : user ? (
        <SocietyShell
          user={user}
          onLogout={handleLogout}
          onUserUpdated={setUser}
          onSwitchRole={canSwitchLoginRole(user) ? handleSwitchRole : undefined}
        />
      ) : guestScreen === 'plans' ? (
        <PlansScreen onBack={() => setGuestScreen('login')} />
      ) : guestScreen === 'forgot-password' ? (
        <ForgotPasswordScreen
          onBackToLogin={() => setGuestScreen('login')}
          onPasswordReset={() => setGuestScreen('login')}
        />
      ) : (
        <LoginScreen
          onLoggedIn={handleLoggedIn}
          onViewPlans={() => setGuestScreen('plans')}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppAlertProvider>
        <AppRoot key={appLaunchGeneration} />
        <GlobalLoadingOverlay />
      </AppAlertProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
