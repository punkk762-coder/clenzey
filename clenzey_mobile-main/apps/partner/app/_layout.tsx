import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { paperTheme } from '@clenzey/design-system';
import { ThemeProvider, Toast } from '@clenzey/design-system';
import { useDesignSystemFonts } from '@clenzey/design-system/fonts';
import { ErrorBoundary, NetworkStatusBanner } from '@clenzey/design-system';
import {
  AnimatedSplashScreen,
  hideNativeSplashScreen,
  preventNativeSplashAutoHide,
  SPLASH_MIN_DURATION_MS,
} from '../src/components/AnimatedSplashScreen';
import { useAuthStore } from '../src/store/auth';
import { useOnboardingStore } from '../src/store/onboarding';
import { useSocketManager } from '../src/hooks/useSocketManager';
import { useAssignmentNotifications } from '../src/hooks/useAssignmentNotifications';
import { useRealtimeCacheInvalidation } from '../src/hooks/useRealtimeCacheInvalidation';
import { useNotifications } from '../src/hooks/useNotifications';
import {
  setupForegroundNotificationHandler,
  setupNotificationPressHandler,
} from '../src/services/notifications';

const FONT_LOAD_TIMEOUT_MS = 5000;

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
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AppContent() {
  const socketManager = useSocketManager();
  useAssignmentNotifications(socketManager);
  useRealtimeCacheInvalidation(socketManager);
  useNotifications();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const cleanup = setupForegroundNotificationHandler((title, body) => {
      setToastMessage(title || body);
      setToastVisible(true);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationPressHandler();
    return cleanup;
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <NetworkStatusBanner />
        <Slot />
      </ErrorBoundary>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        variant="info"
        onDismiss={() => setToastVisible(false)}
      />
    </>
  );
}

export default function RootLayout() {
  const { isAuthenticated, isLoading, user, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments() as string[];

  const [fontsLoaded, fontError] = useDesignSystemFonts();
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  const {
    completed: onboardingCompleted,
    checked: onboardingChecked,
    hydrate: hydrateOnboarding,
  } = useOnboardingStore();

  useEffect(() => {
    if (fontsLoaded || fontError) return;

    const timeout = setTimeout(() => {
      setFontTimedOut(true);
    }, FONT_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    preventNativeSplashAutoHide();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashMinElapsed(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    hydrateOnboarding();
  }, [hydrateOnboarding]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const currentSubSegment = segments.length > 1 ? segments[1] : undefined;

    if (!isAuthenticated) {
      if (!onboardingCompleted) {
        if (currentSubSegment !== 'onboarding') {
          router.replace('/(auth)/onboarding');
        }
      } else if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (user?.approvalStatus === 'PENDING' || user?.approvalStatus === 'REJECTED') {
      if (currentSubSegment !== 'pending-approval') {
        router.replace('/(auth)/pending-approval');
      }
    } else {
      if (!inTabsGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, user, segments, router, onboardingChecked, onboardingCompleted]);

  const bootstrapComplete =
    !isLoading && onboardingChecked && (fontsLoaded || fontTimedOut);
  const shouldDismissSplash = bootstrapComplete && splashMinElapsed;
  const showSplashOverlay = !splashHidden;

  return (
    <SafeAreaProvider style={{ flex: 1 }} initialMetrics={safeAreaInitialMetrics}>
      <PaperProvider theme={paperTheme}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </PaperProvider>
      {showSplashOverlay ? (
        <AnimatedSplashScreen
          overlay
          shouldDismiss={shouldDismissSplash}
          onDismissed={() => setSplashHidden(true)}
          onReady={hideNativeSplashScreen}
        />
      ) : null}
    </SafeAreaProvider>
  );
}
