import { StyleSheet, ViewStyle } from 'react-native';
import { FAB as PaperFAB } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { colors } from '@clenzey/design-system';

interface FABProps {
  icon: typeof SparklesIcon;
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
}

export function FAB({ icon, onPress, label, style }: FABProps) {
  return (
    <PaperFAB
      icon={() => <HugeiconsIcon icon={icon} size={24} color={colors.white} strokeWidth={1.5} />}
      onPress={onPress}
      label={label}
      style={[styles.fab, style]}
      color={colors.white}
      customSize={56}
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
