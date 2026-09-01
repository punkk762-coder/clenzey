import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors, controlSizes } from './index';
import { fonts, type FontFamily } from './fonts';

const MD3_FALLBACK_SIZES = {
  displayLarge: { fontSize: 57, lineHeight: 64 },
  displayMedium: { fontSize: 45, lineHeight: 52 },
  displaySmall: { fontSize: 36, lineHeight: 44 },
  headlineLarge: { fontSize: 32, lineHeight: 40 },
  headlineMedium: { fontSize: 28, lineHeight: 36 },
  headlineSmall: { fontSize: 24, lineHeight: 32 },
  titleLarge: { fontSize: 22, lineHeight: 28 },
  titleMedium: { fontSize: 16, lineHeight: 24 },
  titleSmall: { fontSize: 14, lineHeight: 20 },
} as const;

function md3Size<K extends keyof typeof MD3_FALLBACK_SIZES>(variant: K) {
  return MD3_FALLBACK_SIZES[variant];
}

const compactFont = (fontSize: number, lineHeight: number, fontFamily: FontFamily = fonts.regular) => ({
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight: '400' as const,
  letterSpacing: 0.15,
});

const displayLarge = md3Size('displayLarge');
const displayMedium = md3Size('displayMedium');
const displaySmall = md3Size('displaySmall');
const headlineLarge = md3Size('headlineLarge');
const headlineMedium = md3Size('headlineMedium');
const headlineSmall = md3Size('headlineSmall');
const titleLarge = md3Size('titleLarge');
const titleMedium = md3Size('titleMedium');
const titleSmall = md3Size('titleSmall');

export const paperInputContentStyle = {
  height: controlSizes.input.height,
  fontSize: controlSizes.input.fontSize,
} as const;

export const paperInputTextStyle = {
  fontSize: controlSizes.input.fontSize,
} as const;

export const paperButtonContentStyle = {
  height: controlSizes.button.height,
} as const;

export const paperButtonLabelStyle = {
  fontSize: controlSizes.button.fontSize,
  fontWeight: '600' as const,
} as const;

export const paperTheme = {
  ...(MD3LightTheme ?? {}),
  roundness: 10,
  colors: {
    ...(MD3LightTheme?.colors ?? {}),
    primary: colors.primary,
    onPrimary: colors.white,
    primaryContainer: colors.tertiary,
    onPrimaryContainer: colors.textPrimary,
    secondary: colors.secondary,
    onSecondary: colors.white,
    secondaryContainer: colors.tertiary,
    onSecondaryContainer: colors.textPrimary,
    tertiary: colors.tertiary,
    background: colors.white,
    surface: colors.surface,
    surfaceVariant: '#F1F5F9',
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: '#E2E8F0',
    outlineVariant: '#E5E7EB',
    error: colors.error,
    surfaceDisabled: '#B0BEC5',
    onSurfaceDisabled: colors.white,
  },
  fonts: configureFonts({
    config: {
      ...(MD3LightTheme?.fonts ?? {}),
      displayLarge: compactFont(displayLarge.fontSize, displayLarge.lineHeight, fonts.bold),
      displayMedium: compactFont(displayMedium.fontSize, displayMedium.lineHeight, fonts.bold),
      displaySmall: compactFont(displaySmall.fontSize, displaySmall.lineHeight, fonts.bold),
      headlineLarge: compactFont(headlineLarge.fontSize, headlineLarge.lineHeight, fonts.bold),
      headlineMedium: compactFont(headlineMedium.fontSize, headlineMedium.lineHeight, fonts.bold),
      headlineSmall: compactFont(headlineSmall.fontSize, headlineSmall.lineHeight, fonts.bold),
      titleLarge: compactFont(titleLarge.fontSize, titleLarge.lineHeight, fonts.semiBold),
      titleMedium: compactFont(titleMedium.fontSize, titleMedium.lineHeight, fonts.semiBold),
      titleSmall: compactFont(titleSmall.fontSize, titleSmall.lineHeight, fonts.semiBold),
      bodyLarge: compactFont(controlSizes.input.fontSize, 18),
      bodyMedium: compactFont(controlSizes.input.fontSize, 18),
      bodySmall: compactFont(12, 16),
      labelLarge: compactFont(12, 16, fonts.semiBold),
      labelMedium: compactFont(12, 16, fonts.semiBold),
      labelSmall: compactFont(11, 14, fonts.semiBold),
    },
  }),
};

export const tabBarOptions = {
  activeTintColor: colors.primary,
  inactiveTintColor: '#9CA3AF',
  style: {
    backgroundColor: colors.white,
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  labelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: fonts.semiBold,
    lineHeight: 16,
  },
};
