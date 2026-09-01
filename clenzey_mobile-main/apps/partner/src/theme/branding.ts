import { colors } from '@clenzey/design-system';

/** Partner app native + in-app splash branding (distinct from consumer primary-blue). */
export const partnerBranding = {
  splashBackground: colors.secondary,
  splashAccentPrimary: colors.secondary,
  splashAccentSecondary: colors.tertiary,
  notificationColor: colors.primary,
  adaptiveIconBackground: colors.neutral,
  logoAspectRatio: 798 / 195,
  splashLogoWidthRatio: 0.9,
} as const;
