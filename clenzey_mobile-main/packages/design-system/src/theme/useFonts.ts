import { useFonts as useExpoFonts } from 'expo-font';
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';

/**
 * Loads Nunito Sans variants used throughout the design system.
 *
 * @returns A tuple of [fontsLoaded: boolean, fontError: Error | null]
 */
export function useDesignSystemFonts() {
  return useExpoFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
}
