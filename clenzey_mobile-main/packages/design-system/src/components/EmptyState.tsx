import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Title text displayed below the icon */
  title: string;
  /** Subtitle text providing additional context */
  subtitle?: string;
  /** Emoji or text icon displayed at the top */
  icon?: string;
  /** Optional action button */
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * EmptyState component for displaying when lists have no data.
 * Shows a centered layout with icon, title, subtitle, and optional CTA button.
 */
export function EmptyState({ title, subtitle, icon, action }: EmptyStateProps) {
  const theme = useTheme();

  const titleStyle: TextStyle = {
    fontFamily: theme.typography.headline3.fontFamily,
    fontSize: theme.typography.headline3.fontSize,
    fontWeight: theme.typography.headline3.fontWeight as TextStyle['fontWeight'],
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  };

  const subtitleStyle: TextStyle = {
    fontFamily: theme.typography.body2.fontFamily,
    fontSize: theme.typography.body2.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  };

  const actionContainerStyle: ViewStyle = {
    marginTop: theme.spacing.lg,
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={titleStyle}>{title}</Text>
      {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
      {action && (
        <View style={actionContainerStyle}>
          <Button variant="primary" title={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
  },
});
