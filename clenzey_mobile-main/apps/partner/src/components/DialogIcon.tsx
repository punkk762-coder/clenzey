import { View, StyleSheet } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { colors } from '@clenzey/design-system';

export type DialogIconType = 'error' | 'success' | 'logout';

interface DialogIconProps {
  type: DialogIconType;
  compact?: boolean;
}

const ICON_CONFIG: Record<DialogIconType, { icon: typeof Alert02Icon; color: string; bgColor: string }> = {
  success: {
    icon: CheckmarkCircle01Icon,
    color: colors.primary,
    bgColor: '#EFF6FF',
  },
  error: {
    icon: Alert02Icon,
    color: colors.error,
    bgColor: '#FEF2F2',
  },
  logout: {
    icon: Logout01Icon,
    color: colors.error,
    bgColor: '#FEF2F2',
  },
};

export function DialogIcon({ type, compact = false }: DialogIconProps) {
  const config = ICON_CONFIG[type];

  return (
    <View style={[styles.container, compact && styles.containerCompact, { backgroundColor: config.bgColor }]}>
      <HugeiconsIcon icon={config.icon} size={compact ? 22 : 28} color={config.color} strokeWidth={1.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  containerCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
});
