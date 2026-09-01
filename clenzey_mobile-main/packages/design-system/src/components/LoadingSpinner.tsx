import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ message, size = 'large' }: LoadingSpinnerProps) {
  const theme = useTheme();

  const messageStyle: TextStyle = {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.body2.fontFamily,
    fontSize: theme.typography.body2.fontSize,
  };

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message || 'Loading'}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && <Text style={messageStyle}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
