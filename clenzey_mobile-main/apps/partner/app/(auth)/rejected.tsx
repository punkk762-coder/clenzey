import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import { colors, IconCircle, materialStyle, fonts } from '@clenzey/design-system';
import { useAuthStore } from '../../src/store/auth';
import { sharedPaperStyles } from '../../src/styles/paperControls';

export default function RejectedScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.card, materialStyle('card')]}>
        <IconCircle
          icon={Cancel01Icon}
          size={80}
          iconSize={40}
          color={colors.error}
          backgroundColor={`${colors.error}18`}
        />
        <Text variant="headlineSmall" style={styles.title}>Account Rejected</Text>
        <Text variant="bodyMedium" style={styles.message}>
          Your partner account application has been rejected. This may be due to incomplete documentation or eligibility criteria not being met.
        </Text>
        <Text variant="bodySmall" style={styles.guidance}>
          If you believe this is an error, contact support at{' '}
          <Text style={styles.link}>support@clenzey.com</Text>
        </Text>
      </View>
      <Button
        mode="outlined"
        compact
        onPress={() => { logout(); router.replace('/(auth)/login'); }}
        textColor={colors.error}
        icon={() => <HugeiconsIcon icon={Logout01Icon} size={18} color={colors.error} strokeWidth={1.5} />}
        style={styles.logoutBtn}
        contentStyle={styles.buttonContent}
      >
        Logout
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    color: colors.error,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  message: {
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  guidance: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: colors.primary,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  logoutBtn: {
    borderColor: colors.error,
    borderRadius: 10,
  },
  buttonContent: sharedPaperStyles.buttonContent,
});
