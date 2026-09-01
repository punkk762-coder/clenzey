import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Dimensions, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { paperTheme, colors, fonts } from '@clenzey/design-system';
import { stackHeaderChrome } from '../src/components/StackBackButton';
import { detailHeaderOptions } from '../src/navigation/detailHeaderOptions';
import {
  AnimatedSplashScreen,
  hideNativeSplashScreen,
  preventNativeSplashAutoHide,
  SPLASH_MIN_DURATION_MS,
} from '../src/components/AnimatedSplashScreen';
import { ThemeProvider, Toast } from '@clenzey/design-system';
import { useDesignSystemFonts } from '@clenzey/design-system/fonts';
import { ErrorBoundary, NetworkStatusBanner } from '@clenzey/design-system';
import { useOnboardingStore } from '../src/store/onboarding';
import { useAuthStore } from '../src/store/auth';
import { useAddressStore } from '../src/store/address';
import { useSocketManager } from '../src/hooks/useSocketManager';
import { useRealtimeCacheInvalidation } from '../src/hooks/useRealtimeCacheInvalidation';
import {
  setupForegroundNotificationHandler,
  setupNotificationPressHandler,
  handleColdStartNotification,
} from '../src/services/notifications';
import { useNotifications } from '../src/hooks/useNotifications';
import { syncSelectedAddressForUser } from '../src/services/address-selection';
import Constants from 'expo-constants';

const pushNotificationsEnabled =
  Constants.expoConfig?.extra?.pushNotificationsEnabled !== false;

const FONT_LOAD_TIMEOUT_MS = 5000;
const BOOTSTRAP_TIMEOUT_MS = 10000;

const safeAreaInitialMetrics = {
  frame: {
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * Renders inside QueryClientProvider to handle React Query cache invalidation
 * on Socket.IO real-time events.
 */
function RealtimeCacheManager({ socketManager }: { socketManager: ReturnType<typeof useSocketManager> }) {
  useRealtimeCacheInvalidation(socketManager);
  return null;
}

/**
 * Root layout for the Consumer app.
 *
 * Responsibilities:
 * - Hydrates auth state from secure storage on mount
 * - Shows a loading/splash screen while hydration is in progress
 * - Auth guard: redirects unauthenticated users to login, authenticated users away from auth screens
 * - isNewUser handling: redirects to profile-completion if user.fullName is empty
 * - Address guard: redirects to address selection if no delivery address is selected
 * - Wraps the app in ThemeProvider and QueryClientProvider
 * - API client is configured in src/lib/api.ts (imported by screens as needed)
 */
const logoHeaderOptions = {
  headerShown: true,
  title: '',
  headerTitle: () => (
    <Image
      source={require('@clenzey/design-system/assets/logo.png')}
      style={{ width: 100, height: 28 }}
      resizeMode="contain"
    />
  ),
  ...stackHeaderChrome,
  headerStyle: { backgroundColor: '#FFFFFF' },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useDesignSystemFonts();
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  const { isAuthenticated, isLoading, user, hydrate } = useAuthStore();
  const {
    selectedAddressId,
    isHydrated: isAddressHydrated,
    clearInMemorySelection,
  } = useAddressStore();
  const segments = useSegments() as string[];
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = !!rootNavigationState?.key;

  const {
    completed: onboardingCompleted,
    checked: onboardingChecked,
    hydrate: hydrateOnboarding,
  } = useOnboardingStore();

  // Toast state for in-app foreground notifications
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const coldStartHandled = useRef(false);

  // Font loading timeout: proceed with system fallback after 5 seconds
  useEffect(() => {
    if (fontsLoaded || fontError) return;

    const timer = setTimeout(() => {
      setFontTimedOut(true);
    }, FONT_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  // Never block the splash forever if secure storage or address bootstrap stalls
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootstrapTimedOut(true);
    }, BOOTSTRAP_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  // Initialize Socket.IO connection when authenticated
  // The hook manages connect/disconnect based on auth state
  const socketManager = useSocketManager();

  // Initialize push notifications — requests permission and registers FCM token
  // after auth hydration completes; token removal is handled by auth store logout
  useNotifications();

  // Keep native splash visible until the animated JS splash is ready
  useEffect(() => {
    preventNativeSplashAutoHide();
  }, []);

  // Ensure the splash animation is visible for a minimum duration on every cold start
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashMinElapsed(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  // Hydrate auth and onboarding state on mount
  useEffect(() => {
    hydrate();
    hydrateOnboarding();
  }, [hydrate, hydrateOnboarding]);

  // Restore or auto-select the consumer's delivery address after auth is ready
  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;

    async function bootstrapAddress() {
      useAddressStore.setState({ isHydrated: false });

      if (isAuthenticated && user?.id) {
        await syncSelectedAddressForUser(user.id);
      } else {
        clearInMemorySelection();
      }

      if (!cancelled) {
        useAddressStore.setState({ isHydrated: true });
      }
    }

    bootstrapAddress();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, user?.id, clearInMemorySelection]);

  const bootstrapComplete = Boolean(
    bootstrapTimedOut ||
      (!isLoading &&
        onboardingChecked &&
        isAddressHydrated &&
        (fontsLoaded || fontTimedOut || fontError)),
  );

  // Set up foreground notification handler (in-app toast) and press handler (deep linking)
  useEffect(() => {
    if (Platform.OS === 'web' || !pushNotificationsEnabled) {
      return;
    }

    const cleanupForeground = setupForegroundNotificationHandler(
      (title, body) => {
        const message = title ? `${title}: ${body}` : body;
        setToastMessage(message);
        setToastVisible(true);
      },
    );
    const cleanupPress = setupNotificationPressHandler();

    return () => {
      cleanupForeground();
      cleanupPress();
    };
  }, []);

  // Deep-link when the app was opened from a killed state via notification tap.
  useEffect(() => {
    if (Platform.OS === 'web' || !pushNotificationsEnabled) {
      return;
    }

    if (!bootstrapComplete || !isNavigationReady || !isAuthenticated) {
      return;
    }

    if (coldStartHandled.current) {
      return;
    }

    coldStartHandled.current = true;
    void handleColdStartNotification();
  }, [bootstrapComplete, isNavigationReady, isAuthenticated]);

  // Auth-based navigation guard
  useEffect(() => {
    if (!bootstrapComplete || !isNavigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProfileCompletion = segments[0] === 'profile-completion';
    const inAddressFlow = segments[0] === 'address';
    const inTabs = segments[0] === '(tabs)';
    const profileComplete = !!user?.fullName?.trim();
    const hasSelectedAddress = !!selectedAddressId;

    const redirectAfterAuth = () => {
      if (!profileComplete) {
        router.replace('/profile-completion');
      } else if (!hasSelectedAddress) {
        router.replace('/address/select?required=true');
      } else {
        router.replace('/(tabs)');
      }
    };

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated and not on auth screens → check onboarding status
      if (!onboardingCompleted) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(auth)/login');
      }
    } else if (!isAuthenticated && inAuthGroup) {
      // Not authenticated, on auth screens → ensure correct auth sub-route
      const authSegment = segments[1];
      if (onboardingCompleted && authSegment === 'onboarding') {
        router.replace('/(auth)/login');
      } else if (!onboardingCompleted && authSegment !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated but still on auth screens → redirect into the app
      redirectAfterAuth();
    } else if (isAuthenticated && inProfileCompletion && profileComplete) {
      // Profile just completed — continue to address selection or main app
      redirectAfterAuth();
    } else if (isAuthenticated && !inAuthGroup && !inProfileCompletion && !inTabs) {
      // Enforce onboarding steps only outside the main tab app (e.g. deep links)
      if (!profileComplete) {
        router.replace('/profile-completion');
      } else if (!hasSelectedAddress && !inAddressFlow) {
        router.replace('/address/select?required=true');
      }
    }
  }, [
    bootstrapComplete,
    isNavigationReady,
    isAuthenticated,
    segments,
    user,
    router,
    onboardingCompleted,
    selectedAddressId,
  ]);

  const shouldDismissSplash = bootstrapComplete && splashMinElapsed;
  const showSplashOverlay = !splashHidden;

  return (
    <SafeAreaProvider style={{ flex: 1 }} initialMetrics={safeAreaInitialMetrics}>
      <PaperProvider theme={paperTheme}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            {bootstrapComplete ? (
              <RealtimeCacheManager socketManager={socketManager} />
            ) : null}
            <StatusBar style="auto" />
            <NetworkStatusBanner />
            <Stack screenOptions={{ headerShown: false, headerTitleAlign: 'center' }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="profile-completion"
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="address"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="services/[id]"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="offers/select-service"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="booking/create"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen name="booking/preview" options={logoHeaderOptions} />
              <Stack.Screen name="booking/payment" options={logoHeaderOptions} />
              <Stack.Screen name="quotations/index" options={logoHeaderOptions} />
              <Stack.Screen name="quotations/create" options={logoHeaderOptions} />
              <Stack.Screen
                name="referral"
                options={detailHeaderOptions('Refer & Earn', '/(tabs)/profile')}
              />
              <Stack.Screen
                name="legal/terms"
                options={detailHeaderOptions('Terms & Condition')}
              />
              <Stack.Screen
                name="legal/privacy"
                options={detailHeaderOptions('Privacy Policy')}
              />
              <Stack.Screen
                name="legal/safety-guarantee"
                options={detailHeaderOptions('Safety Guarantee')}
              />
            </Stack>
            {bootstrapComplete ? (
              <Toast
                visible={toastVisible}
                message={toastMessage}
                variant="info"
                onDismiss={() => setToastVisible(false)}
              />
            ) : null}
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
      </PaperProvider>
      {showSplashOverlay ? (
        <AnimatedSplashScreen
          overlay={true}
          shouldDismiss={shouldDismissSplash}
          onDismissed={() => setSplashHidden(true)}
          onReady={hideNativeSplashScreen}
        />
      ) : null}
    </SafeAreaProvider>
  );
}
