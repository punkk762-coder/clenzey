import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Logo, colors, fonts } from '@clenzey/design-system';

interface AuthScreenHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthScreenHeader({ title, subtitle }: AuthScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Logo width={168} style={styles.logo} />
      <View style={styles.accentRow}>
        <View style={styles.accentDot} />
        <View style={styles.accentLine} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    marginBottom: 20,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  accentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    paddingHorizontal: 12,
  },
});
