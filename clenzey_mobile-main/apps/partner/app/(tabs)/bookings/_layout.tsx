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
  contentStyle: { backgroundColor: colors.surface },
};

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
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Bookings' }} />
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
