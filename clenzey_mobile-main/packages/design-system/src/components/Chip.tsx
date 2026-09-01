import React from 'react';
import { Pressable, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { materialPressedStyle, materialStyle } from '../theme/material';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
}

export function Chip({ label, selected = false, onPress, onClose }: ChipProps) {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    borderRadius: theme.borderRadius.pill,
    paddingVertical: theme.controlSizes.chip.paddingVertical,
    paddingHorizontal: theme.controlSizes.chip.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: selected ? theme.colors.primary : theme.colors.white,
    borderWidth: selected ? 0 : 1,
    borderColor: '#E8EDF5',
    ...(selected ? materialStyle('tabActive') : {}),
  };

  const textStyle: TextStyle = {
    fontFamily: theme.typography.body2.fontFamily,
    fontSize: theme.controlSizes.chip.fontSize,
    fontWeight: '600',
    color: selected ? theme.colors.white : theme.colors.textPrimary,
  };

  const closeStyle: TextStyle = {
    marginLeft: theme.spacing.xs,
    fontSize: 12,
    color: selected ? theme.colors.white : theme.colors.textSecondary,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && (selected ? materialPressedStyle('tab') : materialPressedStyle('chip')),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={textStyle}>{label}</Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Text style={closeStyle}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );
}
