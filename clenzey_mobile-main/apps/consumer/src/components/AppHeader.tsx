import { View, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButtonSurface } from './BackButton';

interface AppHeaderProps {
  showBack?: boolean;
  navigation?: any;
}

/**
 * Shared app header with Clenzey logo centered and optional back button.
 * Used across all non-auth screens.
 */
export function AppHeader({ showBack = false }: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            {({ pressed }) => <BackButtonSurface pressed={pressed} variant="header" />}
          </Pressable>
        ) : null}
      </View>
      <Image
        source={require('@clenzey/design-system/assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.right} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  left: { width: 44, alignItems: 'flex-start' },
  right: { width: 44 },
  logo: { width: 100, height: 28 },
});
