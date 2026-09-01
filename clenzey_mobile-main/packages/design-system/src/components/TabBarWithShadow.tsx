import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

const TOP_SHADOW_LAYERS = [
  { offset: 1, opacity: 0.1 },
  { offset: 3, opacity: 0.07 },
  { offset: 6, opacity: 0.045 },
  { offset: 10, opacity: 0.03 },
] as const;

export function TabBarWithShadow(props: BottomTabBarProps & { style?: ViewStyle }) {
  const { style, ...rest } = props;
  const flatStyle = StyleSheet.flatten(style) as ViewStyle | undefined;

  if (flatStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.shell, flatStyle]}>
      {TOP_SHADOW_LAYERS.map((layer) => (
        <View
          key={layer.offset}
          pointerEvents="none"
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
      <View style={styles.surface}>
        <BottomTabBar {...rest} style={styles.innerTabBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    overflow: 'visible',
    width: '100%',
    ...Platform.select({
      web: {
        flexShrink: 0,
      },
      ios: {
        shadowColor: '#03045E',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
      default: {
        boxShadow: '0 -6px 20px rgba(3, 4, 94, 0.16), 0 -2px 6px rgba(3, 4, 94, 0.08)',
      },
    }),
  },
  shadowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 0,
  },
  surface: {
    backgroundColor: colors.white,
    zIndex: 1,
    flex: 1,
  },
  innerTabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});
