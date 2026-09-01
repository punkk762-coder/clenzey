import { Stack } from 'expo-router';
import { colors, fonts } from '@clenzey/design-system';
import { StackBackButton, stackHeaderChrome } from '../../../src/components/StackBackButton';

const detailScreenOptions = {
  ...stackHeaderChrome,
  headerShown: true,
  headerLeft: () => <StackBackButton fallbackRoute="/(tabs)/bookings" />,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontFamily: fonts.bold,
    fontWeight: '700' as const,
    fontSize: 16,
    color: colors.textPrimary,
  },
  contentStyle: { backgroundColor: colors.white },
};

/**
 * Bookings stack navigator within the tab.
 * Contains the booking list and booking detail screen.
 */
export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.textPrimary,
        headerBackTitle: '',
        headerTitleStyle: {
          fontFamily: fonts.bold,
          fontWeight: '700',
          fontSize: 16,
          color: colors.textPrimary,
        },
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'My Bookings' }} />
      <Stack.Screen
        name="[id]"
        options={{
          ...detailScreenOptions,
          title: 'Booking Details',
        }}
      />
    </Stack>
  );
}
