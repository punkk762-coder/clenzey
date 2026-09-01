import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: CardProps) {
  const theme = useTheme();

  const cardStyles: ViewStyle = {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    ...Platform.select<ViewStyle>({
      ios: theme.shadows.card,
      android: { elevation: theme.shadows.card.elevation },
      default: {
        boxShadow: '0 4px 12px rgba(3, 4, 94, 0.08)',
      },
    }),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyles,
          pressed && styles.pressed,
          style,
        ]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyles, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.95,
  },
});
