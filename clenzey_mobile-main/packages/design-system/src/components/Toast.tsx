import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({
  visible,
  message,
  variant = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-100);
    }
  }, [visible]);

  function dismiss() {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }

  if (!visible) return null;

  const variantColor = getVariantColor(variant, theme.colors);

  const containerStyle: ViewStyle = {
    backgroundColor: variantColor,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  };

  const textStyle: TextStyle = {
    color: theme.colors.white,
    fontFamily: theme.typography.body2.fontFamily,
    fontSize: theme.typography.body2.fontSize,
    fontWeight: '500',
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Animated.View style={containerStyle}>
        <Text style={textStyle}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}

function getVariantColor(
  variant: ToastVariant,
  colors: { success: string; error: string; primary: string },
): string {
  switch (variant) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.error;
    case 'info':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
