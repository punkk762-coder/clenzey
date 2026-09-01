import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle, ImageSourcePropType } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: AvatarSize;
}

const SIZES: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

export function Avatar({ source, name, size = 'md' }: AvatarProps) {
  const theme = useTheme();
  const dimension = SIZES[size];

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const textStyle: TextStyle = {
    color: theme.colors.white,
    fontFamily: theme.typography.label.fontFamily,
    fontWeight: '700',
    fontSize: dimension * 0.38,
  };

  const initials = getInitials(name);

  if (source) {
    return (
      <View style={containerStyle} accessibilityRole="image" accessibilityLabel={name || 'Avatar'}>
        <Image
          source={source}
          style={{ width: dimension, height: dimension }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle} accessibilityRole="image" accessibilityLabel={name || 'Avatar'}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
