import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../theme';
import { fonts } from '../theme/fonts';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
}

export function ScreenTitle({ title, subtitle }: ScreenTitleProps) {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMedium" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: colors.white,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
});
