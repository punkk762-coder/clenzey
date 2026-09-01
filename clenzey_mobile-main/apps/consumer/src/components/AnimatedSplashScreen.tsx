import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';

const logoSource = require('@clenzey/design-system/assets/logo-white.png');

/** Expo Go and release APKs use the lightweight splash — Reanimated worklets can crash on cold start in standalone release builds (new arch). */
const useSimpleSplash = Constants.appOwnership === 'expo' || !__DEV__;

interface AnimatedSplashScreenProps {
  onReady?: () => void;
  shouldDismiss?: boolean;
  onDismissed?: () => void;
  overlay?: boolean;
}

/** Lightweight splash for Expo Go — avoids Reanimated worklets during startup. */
function SimpleSplashScreen({
  onReady,
  shouldDismiss = false,
  onDismissed,
  overlay = false,
}: AnimatedSplashScreenProps) {
  const hasDismissedRef = useRef(false);

  useEffect(() => {
    if (!shouldDismiss || hasDismissedRef.current) return;

    const timer = setTimeout(() => {
      if (hasDismissedRef.current) return;
      hasDismissedRef.current = true;
      onDismissed?.();
    }, 450);

    return () => clearTimeout(timer);
  }, [shouldDismiss, onDismissed]);

  return (
    <View
      style={[styles.container, overlay && styles.overlay]}
      onLayout={() => onReady?.()}
      pointerEvents={shouldDismiss ? 'none' : 'auto'}
    >
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color="#FFFFFF" style={styles.loader} />
    </View>
  );
}

export function AnimatedSplashScreen(props: AnimatedSplashScreenProps) {
  if (useSimpleSplash) {
    return <SimpleSplashScreen {...props} />;
  }

  const { ReanimatedSplashScreen } =
    require('./ReanimatedSplashScreen') as typeof import('./ReanimatedSplashScreen');
  return <ReanimatedSplashScreen {...props} />;
}

/** Hide the native splash once the animated JS splash has laid out. */
export async function hideNativeSplashScreen() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Native splash may already be hidden.
  }
}

/** Keep native splash visible until JS splash is ready. */
export function preventNativeSplashAutoHide() {
  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore if native splash is unavailable (e.g. web).
  });
}

/** Minimum time the branded splash should stay visible so animations can be seen. */
export const SPLASH_MIN_DURATION_MS = Platform.select({
  web: 2200,
  default: 2000,
}) as number;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0043BA',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: 200,
    height: 69,
  },
  loader: {
    marginTop: 28,
  },
});
