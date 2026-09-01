import { TextStyle } from 'react-native';
import { fonts } from './fonts';

export { fonts } from './fonts';

export const colors = {
  primary: '#0043BA',
  secondary: '#00B4D8',
  tertiary: '#90E0EF',
  neutral: '#03045E',
  surface: '#F8FAFC',
  surfaceVariant: '#F1F5F9',
  chipInactive: '#F1F5F9',
  white: '#FFFFFF',
  black: '#1A1A1A',
  error: '#DC3545',
  success: '#28A745',
  textPrimary: '#03045E',
  textSecondary: '#6B7280',
} as const;

export interface TypographyVariant {
  fontFamily: string;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
}

export const typography = {
  fontFamily: 'Nunito Sans',
  headline1: {
    fontFamily: fonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
  },
  headline2: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  headline3: {
    fontFamily: fonts.bold,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  body1: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  body2: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: '600' as const,
  },
} as const;

export const spacing = {
  base: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  pill: 10,
} as const;

export const shadows = {
  card: {
    shadowColor: '#03045E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSoft: {
    shadowColor: '#03045E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const controlSizes = {
  button: {
    height: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 15,
  },
  input: {
    height: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  tab: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
} as const;

export { materialStyle, materialPressedStyle } from './material';
export type { MaterialPreset } from './material';

export { semanticTones, getSemanticTone } from './semantic';
export type { SemanticTone, SemanticToneColors } from './semantic';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  controlSizes,
} as const;

export type Theme = typeof theme;
