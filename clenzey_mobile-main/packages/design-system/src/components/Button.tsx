import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { materialPressedStyle, materialStyle } from '../theme/material';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle = {
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: isDisabled ? 0.5 : 1,
    ...getSizeStyles(size, theme.controlSizes),
    ...getVariantStyles(variant, theme.colors),
    ...(variant === 'primary' || variant === 'secondary'
      ? materialStyle('button')
      : variant === 'outline'
        ? materialStyle('chipRaised')
        : {}),
  };

  const textStyles: TextStyle = {
    fontFamily: theme.typography.body1.fontFamily,
    fontWeight: '600',
    ...getTextSizeStyles(size, theme.controlSizes),
    ...getTextVariantStyles(variant, theme.colors),
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerStyles,
        pressed && !isDisabled && (variant === 'primary' || variant === 'secondary'
          ? materialPressedStyle('button')
          : styles.pressed),
        style as ViewStyle,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getIndicatorColor(variant, theme.colors)}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

function getSizeStyles(
  size: ButtonSize,
  controls: { button: { height: number; paddingVertical: number; paddingHorizontal: number } },
): ViewStyle {
  switch (size) {
    case 'sm':
      return {
        minHeight: 40,
        paddingVertical: 8,
        paddingHorizontal: 12,
      };
    case 'md':
      return {
        minHeight: controls.button.height,
        paddingVertical: controls.button.paddingVertical,
        paddingHorizontal: controls.button.paddingHorizontal,
      };
    case 'lg':
      return {
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 20,
      };
  }
}

function getTextSizeStyles(
  size: ButtonSize,
  controls: { button: { fontSize: number } },
): TextStyle {
  switch (size) {
    case 'sm':
      return { fontSize: 13 };
    case 'md':
      return { fontSize: controls.button.fontSize };
    case 'lg':
      return { fontSize: 16 };
  }
}

function getVariantStyles(
  variant: ButtonVariant,
  colors: { primary: string; secondary: string },
): ViewStyle {
  switch (variant) {
    case 'primary':
      return { backgroundColor: colors.primary };
    case 'secondary':
      return { backgroundColor: colors.secondary };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
  }
}

function getTextVariantStyles(
  variant: ButtonVariant,
  colors: { primary: string; white: string },
): TextStyle {
  switch (variant) {
    case 'primary':
    case 'secondary':
      return { color: colors.white };
    case 'outline':
    case 'ghost':
      return { color: colors.primary };
  }
}

function getIndicatorColor(
  variant: ButtonVariant,
  colors: { primary: string; white: string },
): string {
  switch (variant) {
    case 'primary':
    case 'secondary':
      return colors.white;
    case 'outline':
    case 'ghost':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
