import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export interface PageIndicatorProps {
  count: number;
  activeIndex: number;
}

export function PageIndicator({ count, activeIndex }: PageIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
});
