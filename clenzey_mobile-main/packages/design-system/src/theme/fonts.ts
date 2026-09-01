/**
 * Nunito Sans — used across consumer and partner apps.
 */
export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
} as const;

export type FontFamily = (typeof fonts)[keyof typeof fonts];
