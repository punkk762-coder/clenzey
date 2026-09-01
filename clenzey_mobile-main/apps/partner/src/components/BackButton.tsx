import { StyleSheet, View, type ViewStyle } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { colors, materialStyle, materialPressedStyle } from '@clenzey/design-system';

export type BackButtonVariant = 'header' | 'floating';

export const BACK_BUTTON_HEADER_SIZE = 40;
export const BACK_BUTTON_FLOATING_SIZE = 44;
export const BACK_BUTTON_SIZE = BACK_BUTTON_FLOATING_SIZE;

const VARIANTS = {
  header: {
    size: BACK_BUTTON_HEADER_SIZE,
    iconSize: 20,
    iconColor: colors.primary,
    surface: {
      backgroundColor: colors.chipInactive,
      borderWidth: 0,
    },
    shadow: null,
  },
  floating: {
    size: BACK_BUTTON_FLOATING_SIZE,
    iconSize: 22,
    iconColor: colors.textPrimary,
    surface: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    shadow: 'chip' as const,
  },
} satisfies Record<
  BackButtonVariant,
  {
    size: number;
    iconSize: number;
    iconColor: string;
    surface: ViewStyle;
    shadow: 'chip' | null;
  }
>;

export function BackButtonIcon({
  variant = 'floating',
}: {
  variant?: BackButtonVariant;
}) {
  const config = VARIANTS[variant];

  return (
    <HugeiconsIcon
      icon={ArrowLeft01Icon}
      size={config.iconSize}
      color={config.iconColor}
      strokeWidth={2}
    />
  );
}

export function BackButtonSurface({
  style,
  pressed,
  variant = 'floating',
}: {
  style?: ViewStyle;
  pressed?: boolean;
  variant?: BackButtonVariant;
}) {
  const config = VARIANTS[variant];

  return (
    <View
      style={[
        styles.base,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
        },
        config.surface,
        config.shadow ? materialStyle(config.shadow) : null,
        pressed ? materialPressedStyle('chip') : null,
        style,
      ]}
    >
      <BackButtonIcon variant={variant} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
