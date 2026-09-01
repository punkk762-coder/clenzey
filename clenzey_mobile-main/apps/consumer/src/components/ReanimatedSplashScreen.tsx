import { useEffect, useRef } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SplashLoader } from './SplashLoader';

const logoSource = require('@clenzey/design-system/assets/logo-white.png');

interface ReanimatedSplashScreenProps {
  onReady?: () => void;
  shouldDismiss?: boolean;
  onDismissed?: () => void;
  overlay?: boolean;
}

export function ReanimatedSplashScreen({
  onReady,
  shouldDismiss = false,
  onDismissed,
  overlay = false,
}: ReanimatedSplashScreenProps) {
  const hasDismissedRef = useRef(false);
  const logoScale = useSharedValue(0.88);
  const logoOpacity = useSharedValue(0);
  const loaderOpacity = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0.45);
  const containerOpacity = useSharedValue(1);
  const bg1Scale = useSharedValue(1);
  const bg2Scale = useSharedValue(1);
  const bg3Scale = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.back(1.2)) });
    loaderOpacity.value = withDelay(350, withTiming(1, { duration: 350 }));

    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    const pulse = (value: SharedValue<number>, delay: number) => {
      value.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.12, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    };

    pulse(bg1Scale, 0);
    pulse(bg2Scale, 250);
    pulse(bg3Scale, 500);
  }, [bg1Scale, bg2Scale, bg3Scale, loaderOpacity, logoOpacity, logoScale, sparkleOpacity]);

  useEffect(() => {
    if (!shouldDismiss || hasDismissedRef.current) return;

    containerOpacity.value = withTiming(
      0,
      { duration: 450, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && onDismissed) {
          runOnJS(handleDismissed)();
        }
      },
    );
  }, [shouldDismiss, containerOpacity, onDismissed]);

  const handleDismissed = () => {
    if (hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    onDismissed?.();
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const bg1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bg1Scale.value }],
  }));

  const bg2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bg2Scale.value }],
  }));

  const bg3Style = useAnimatedStyle(() => ({
    transform: [{ scale: bg3Scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.container, overlay && styles.overlay, containerStyle]}
      onLayout={() => onReady?.()}
      pointerEvents={shouldDismiss ? 'none' : 'auto'}
    >
      <Animated.View style={[styles.bgCircle, styles.bg1, bg1Style]} />
      <Animated.View style={[styles.bgCircle, styles.bg2, bg2Style]} />
      <Animated.View style={[styles.bgCircle, styles.bg3, bg3Style]} />

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <Animated.View style={[styles.sparkle, sparkleStyle]} />
      </Animated.View>

      <Animated.View style={loaderStyle}>
        <SplashLoader />
      </Animated.View>
    </Animated.View>
  );
}

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
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  bg1: {
    top: -100,
    right: -80,
    width: 220,
    height: 220,
    backgroundColor: '#00B4D8',
    opacity: 0.18,
  },
  bg2: {
    bottom: -60,
    left: -80,
    width: 180,
    height: 180,
    backgroundColor: '#90E0EF',
    opacity: 0.12,
  },
  bg3: {
    top: '35%',
    left: -50,
    width: 100,
    height: 100,
    backgroundColor: '#00B4D8',
    opacity: 0.1,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 69,
  },
  sparkle: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});
