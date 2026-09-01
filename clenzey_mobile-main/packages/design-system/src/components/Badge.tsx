import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type BadgeVariant = 'primary' | 'secondary' | 'error';

export interface BadgeProps {
  value: string | number;
  variant?: BadgeVariant;
}

export function Badge({ value, variant = 'primary' }: BadgeProps) {
  const theme = useTheme();

  const variantColor = getVariantColor(variant, theme.colors);

  const containerStyle: ViewStyle = {
    backgroundColor: variantColor,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textStyle: TextStyle = {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.typography.label.fontFamily,
  };

  return (
    <View style={containerStyle} accessibilityRole="text" accessibilityLabel={`Badge: ${value}`}>
      <Text style={textStyle}>{String(value)}</Text>
    </View>
  );
}

function getVariantColor(
  variant: BadgeVariant,
  colors: { primary: string; secondary: string; error: string },
): string {
  switch (variant) {
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.secondary;
    case 'error':
      return colors.error;
  }
}

const styles = StyleSheet.create({});
