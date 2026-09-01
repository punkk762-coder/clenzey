import React from 'react';
import { Platform, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, materialStyle } from '../theme';

export interface DecoratedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  selected?: boolean;
}

const flatCardStyle = Platform.select({
  ios: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  android: { elevation: 0 },
  default: { boxShadow: 'none' },
}) as ViewStyle;

/**
 * Card with border and soft elevation. Selected state uses primary border + tint (flat, no shadow).
 */
export function DecoratedCard({ children, style, contentStyle, selected }: DecoratedCardProps) {
  return (
    <View
      style={[
        styles.card,
        !selected && materialStyle('card'),
        selected && styles.cardSelected,
        selected && flatCardStyle,
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.tertiary + '18',
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
