import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface AuthBackgroundProps {
  variant: 'consumer' | 'partner';
  children: React.ReactNode;
}

export function AuthBackground({ variant, children }: AuthBackgroundProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const baseUnit = Math.min(width, height) * 0.01;
  const isPartner = variant === 'partner';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Soft top wash */}
      <View
        style={[
          styles.shape,
          {
            width: width * 1.2,
            height: height * 0.45,
            borderBottomLeftRadius: width * 0.6,
            borderBottomRightRadius: width * 0.6,
            backgroundColor: theme.colors.white,
            top: 0,
            left: -width * 0.1,
          },
        ]}
      />

      {/* Primary glow — top right */}
      <View
        style={[
          styles.shape,
          {
            width: baseUnit * 52,
            height: baseUnit * 52,
            borderRadius: baseUnit * 26,
            backgroundColor: theme.colors.tertiary,
            opacity: 0.55,
            top: isPartner ? height * 0.02 : height * 0.04,
            right: -baseUnit * 14,
          },
        ]}
      />

      {/* Secondary ring */}
      <View
        style={[
          styles.shape,
          {
            width: baseUnit * 36,
            height: baseUnit * 36,
            borderRadius: baseUnit * 18,
            borderWidth: baseUnit * 2.5,
            borderColor: theme.colors.secondary,
            opacity: 0.22,
            top: isPartner ? height * 0.12 : height * 0.14,
            right: baseUnit * 6,
          },
        ]}
      />

      {/* Bottom-left accent blob */}
      <View
        style={[
          styles.shape,
          {
            width: baseUnit * 44,
            height: baseUnit * 44,
            borderRadius: baseUnit * 22,
            backgroundColor: theme.colors.secondary,
            opacity: 0.12,
            bottom: isPartner ? height * 0.08 : height * 0.1,
            left: -baseUnit * 14,
          },
        ]}
      />

      {/* Mid-left small circle */}
      <View
        style={[
          styles.shape,
          {
            width: baseUnit * 16,
            height: baseUnit * 16,
            borderRadius: baseUnit * 8,
            backgroundColor: theme.colors.primary,
            opacity: 0.08,
            top: isPartner ? height * 0.38 : height * 0.32,
            left: baseUnit * 8,
          },
        ]}
      />

      {/* Diagonal tile — bottom right */}
      <View
        style={[
          styles.shape,
          {
            width: baseUnit * 28,
            height: baseUnit * 28,
            borderRadius: baseUnit * 6,
            backgroundColor: theme.colors.primary,
            opacity: 0.06,
            bottom: isPartner ? height * 0.22 : height * 0.26,
            right: baseUnit * 12,
            transform: [{ rotate: '18deg' }],
          },
        ]}
      />

      {/* Soft bottom fade */}
      <View
        style={[
          styles.shape,
          {
            width: width,
            height: height * 0.18,
            bottom: 0,
            left: 0,
            backgroundColor: theme.colors.tertiary,
            opacity: 0.07,
          },
        ]}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  shape: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
