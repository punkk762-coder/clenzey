import { View, StyleSheet } from 'react-native';
import { colors } from '@clenzey/design-system';

interface CarouselDotsProps {
  total: number;
  activeIndex: number;
}

export function CarouselDots({ total, activeIndex }: CarouselDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tertiary, marginHorizontal: 4 },
  dotActive: { backgroundColor: colors.primary, width: 24, borderRadius: 4 },
});
