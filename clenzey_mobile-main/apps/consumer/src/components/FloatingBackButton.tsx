import { Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { BackButtonSurface } from './BackButton';

interface FloatingBackButtonProps {
  top: number;
  fallbackRoute?: Href;
}

export function FloatingBackButton({ top, fallbackRoute = '/(tabs)/profile/addresses' }: FloatingBackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      style={[styles.wrapper, { top }]}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        if (fallbackRoute) {
          router.replace(fallbackRoute);
        }
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      {({ pressed }) => <BackButtonSurface pressed={pressed} variant="floating" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 1001,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
    }),
  },
});
