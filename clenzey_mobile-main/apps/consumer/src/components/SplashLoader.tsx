import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DOT_COUNT = 3;
const DOT_SIZE = 8;
const DOT_GAP = 10;

function SplashDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 320, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }),
          withTiming(0, { duration: 160 }),
        ),
        -1,
        false,
      ),
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
          withTiming(0.45, { duration: 320, easing: Easing.in(Easing.cubic) }),
          withTiming(0.45, { duration: 160 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, opacity, translateY]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export function SplashLoader() {
  return (
    <View style={styles.row}>
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <SplashDot key={index} delay={index * 140} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_GAP,
    marginTop: 28,
    height: 20,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#90E0EF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
