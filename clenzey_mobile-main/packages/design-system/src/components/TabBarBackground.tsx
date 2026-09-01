import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme';

const SHADOW_LAYERS = [
  { offset: 1, opacity: 0.1 },
  { offset: 3, opacity: 0.07 },
  { offset: 6, opacity: 0.045 },
  { offset: 10, opacity: 0.03 },
] as const;

/**
 * Tab bar backdrop with a top edge shadow that renders above the bar
 * instead of on the clipped container edge.
 */
export function TabBarBackground() {
  return (
    <View style={styles.root}>
      {SHADOW_LAYERS.map((layer) => (
        <View
          key={layer.offset}
          style={[
            styles.shadowLayer,
            {
              top: -layer.offset,
              height: layer.offset,
              backgroundColor: `rgba(3, 4, 94, ${layer.opacity})`,
            },
          ]}
        />
      ))}
      <View style={styles.surface} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    overflow: 'visible',
  },
  shadowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    ...Platform.select({
      ios: {
        shadowColor: '#03045E',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      default: {
        boxShadow: '0 -4px 16px rgba(3, 4, 94, 0.14), 0 -1px 0 rgba(232, 237, 245, 1)',
      },
    }),
  },
});
