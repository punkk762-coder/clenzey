import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { partnerBranding } from '../theme/branding';

const logoSource = require('../../assets/splash-icon.png');

const useSimpleSplash = Constants.appOwnership === 'expo' || !__DEV__;

interface AnimatedSplashScreenProps {
  onReady?: () => void;
  shouldDismiss?: boolean;
  onDismissed?: () => void;
  overlay?: boolean;
}

function SimpleSplashScreen({
  onReady,
  shouldDismiss = false,
  onDismissed,
  overlay = false,
}: AnimatedSplashScreenProps) {
  const hasDismissedRef = useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const logoWidth = screenWidth * partnerBranding.splashLogoWidthRatio;
  const logoHeight = logoWidth / partnerBranding.logoAspectRatio;

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
      <Image
        source={logoSource}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
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

export async function hideNativeSplashScreen() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Native splash may already be hidden.
  }
}

export function preventNativeSplashAutoHide() {
  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore if native splash is unavailable (e.g. web).
  });
}

export const SPLASH_MIN_DURATION_MS = Platform.select({
  web: 2200,
  default: 2000,
}) as number;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: partnerBranding.splashBackground,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  loader: {
    marginTop: 28,
  },
});
