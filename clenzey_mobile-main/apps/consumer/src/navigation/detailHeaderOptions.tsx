import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors, fonts } from '@clenzey/design-system';
import { StackBackButton, stackHeaderChrome } from '../components/StackBackButton';
import type { Href } from 'expo-router';

export function detailHeaderOptions(
  title: string,
  fallbackRoute?: Href,
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    title,
    headerTitleAlign: 'center',
    ...stackHeaderChrome,
    headerLeft: () => <StackBackButton fallbackRoute={fallbackRoute} />,
    headerStyle: { backgroundColor: colors.white },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: {
      fontFamily: fonts.bold,
      fontWeight: '700',
      fontSize: 16,
    },
    contentStyle: { backgroundColor: colors.surface },
  };
}
