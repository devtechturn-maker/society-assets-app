import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, Platform, StyleSheet, View } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { SecureScreenGuard } from './src/components/SecureScreenGuard';
import { FirstLoginPasswordScreen } from './src/screens/FirstLoginPasswordScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlansScreen } from './src/screens/PlansScreen';
import { SocietyShell } from './src/screens/SocietyShell';
import { SplashScreen } from './src/screens/SplashScreen';
import { ExpiredSubscriptionScreen } from './src/screens/ExpiredSubscriptionScreen';
import { loadStoredSession, setSessionInvalidHandler } from './src/services/session';
import { fetchSubscriptionStatus } from './src/services/api';
import { clearSession } from './src/services/storage';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { ScreenCaptureProvider } from './src/context/ScreenCaptureContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { LoginData, SocietySubscriptionStatus } from './src/types/api';
import {
  configurePushNotifications,
  isRemotePushAvailable,
} from './src/services/pushNotifications';

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

  const finishSplash = useCallback(() => {
    setShowSplash(false);
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
            }
          } catch {
            if (!cancelled) {
              setUser(u);
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
  }

  async function handleLogout() {
    await clearSession();
    setUser(null);
    setSubscriptionStatus(null);
    setGuestScreen('login');
    setShowSplash(true);
  }

  if (showSplash) {
    return <SplashScreen onFinish={finishSplash} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      {Platform.OS !== 'web' ? <SecureScreenGuard /> : null}
      {!sessionReady ? (
        <View style={styles.boot}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : user && subscriptionStatus && !subscriptionStatus.canAccessApp ? (
        <ExpiredSubscriptionScreen status={subscriptionStatus} onLogout={handleLogout} />
      ) : user && user.firstLogin ? (
        <FirstLoginPasswordScreen
          user={user}
          onPasswordChanged={(updated) => {
            setUser(updated);
          }}
        />
      ) : user ? (
        <SocietyShell
          user={user}
          onLogout={handleLogout}
          onUserUpdated={setUser}
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
          onForgotPassword={() => setGuestScreen('forgot-password')}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ScreenCaptureProvider>
          <AppAlertProvider>
            <AppRoot key={appLaunchGeneration} />
          </AppAlertProvider>
        </ScreenCaptureProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
