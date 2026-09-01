import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { fonts } from '../theme/fonts';

export interface NetworkStatusBannerProps {
  /** Override the auto-detected connectivity status (useful for testing) */
  isConnected?: boolean;
  /** Custom message to display when offline */
  message?: string;
}

/**
 * NetworkStatusBanner detects network connectivity and shows
 * an animated banner at the top of the screen when offline.
 *
 * Uses @react-native-community/netinfo for connectivity detection.
 * Install it in your app: pnpm add @react-native-community/netinfo
 *
 * Hides automatically when connectivity is restored.
 */
export function NetworkStatusBanner({
  isConnected: isConnectedProp,
  message = 'No internet connection',
}: NetworkStatusBannerProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Determine effective connectivity state
  const effectiveIsConnected = isConnectedProp !== undefined ? isConnectedProp : isConnected;

  // Try to use NetInfo for connectivity detection
  useEffect(() => {
    // Only auto-detect if prop is not provided
    if (isConnectedProp !== undefined) return;

    let unsubscribe: (() => void) | undefined;

    async function setupNetInfo() {
      try {
        const NetInfo = require('@react-native-community/netinfo');
        unsubscribe = NetInfo.addEventListener((state: { isConnected: boolean | null }) => {
          setIsConnected(state.isConnected ?? true);
        });
      } catch {
        // NetInfo not available — fallback to assuming connected
        // Apps should install @react-native-community/netinfo for proper detection
        console.warn(
          '[NetworkStatusBanner] @react-native-community/netinfo not found. ' +
          'Install it for offline detection: pnpm add @react-native-community/netinfo'
        );
        setIsConnected(true);
      }
    }

    setupNetInfo();

    return () => {
      unsubscribe?.();
    };
  }, [isConnectedProp]);

  // Animate banner in/out based on connectivity
  useEffect(() => {
    if (!effectiveIsConnected) {
      // Show banner container, then slide in
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out, then hide banner container
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowBanner(false);
        }
      });
    }
  }, [effectiveIsConnected, slideAnim]);

  // Don't render anything if banner is fully hidden
  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E53E3E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
});
