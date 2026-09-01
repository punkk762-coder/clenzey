import type { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

export interface ElevatedTrayProps {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Flat tray for horizontal chip/tab rows.
 * Matches the SegmentTabs trough — subtle border, no 3D edge shading.
 */
export function ElevatedTray({ children, style, contentStyle }: ElevatedTrayProps) {
  return (
    <View style={[styles.outer, style]}>
      <View style={styles.tray}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 16,
  },
  tray: {
    borderRadius: 12,
    backgroundColor: colors.chipInactive,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  content: {
    padding: 4,
  },
});
