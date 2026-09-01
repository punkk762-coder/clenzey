import { View, StyleSheet } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { colors } from '../theme';

interface IconCircleProps {
  icon: Parameters<typeof HugeiconsIcon>[0]['icon'];
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
}

export function IconCircle({
  icon,
  size = 48,
  iconSize = 24,
  color = colors.primary,
  backgroundColor = colors.tertiary,
}: IconCircleProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <HugeiconsIcon icon={icon} size={iconSize} color={color} strokeWidth={1.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
