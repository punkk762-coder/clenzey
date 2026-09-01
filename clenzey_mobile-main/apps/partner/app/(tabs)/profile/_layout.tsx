import { Stack } from 'expo-router';
import { colors, fonts } from '@clenzey/design-system';
import { stackHeaderChrome } from '../../../src/components/StackBackButton';

const nestedScreenOptions = {
  ...stackHeaderChrome,
  headerShown: true,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontFamily: fonts.bold,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  contentStyle: { backgroundColor: colors.surface },
};

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: fonts.bold,
          fontWeight: '700',
          fontSize: 16,
        },
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="availability" options={{ ...nestedScreenOptions, title: 'Availability' }} />
      <Stack.Screen name="notifications" options={{ ...nestedScreenOptions, title: 'Notifications' }} />
      <Stack.Screen name="reviews" options={{ ...nestedScreenOptions, title: 'Reviews' }} />
    </Stack>
  );
}
