import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface DividerProps {
  color?: string;
  marginVertical?: number;
}

export function Divider({ color, marginVertical }: DividerProps) {
  const theme = useTheme();

  const style: ViewStyle = {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color || theme.colors.textSecondary,
    opacity: 0.3,
    marginVertical: marginVertical ?? theme.spacing.md,
  };

  return <View style={style} accessibilityRole="none" />;
}
