import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Clock01Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import { colors, IconCircle, materialStyle, fonts } from '@clenzey/design-system';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/lib/api';
import { sharedPaperStyles } from '../../src/styles/paperControls';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { setUser, setToken, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleCheckStatus() {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const response = (await apiClient.get('/api/v1/partners/me')) as any;
      const partnerData = response?.partner ?? response?.data?.partner ?? response;
      if (partnerData?.approvalStatus === 'APPROVED') {
        setUser(partnerData as any);
        router.replace('/(tabs)');
        return;
      }
      if (partnerData?.approvalStatus === 'REJECTED') {
        setStatusMessage('Your application has been rejected. Please contact support.');
        return;
      }
      setStatusMessage('Still pending. We will notify you once approved.');
    } catch {
      setStatusMessage('Unable to check status. Please try logging in again.');
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.card, materialStyle('card')]}>
        <IconCircle icon={Clock01Icon} size={80} iconSize={40} color={colors.secondary} />
        <Text variant="headlineSmall" style={styles.title}>Approval Pending</Text>
        <Text variant="bodyMedium" style={styles.message}>
          Your partner account is under review. We'll notify you once approved.
        </Text>
        {statusMessage && (
          <Text variant="bodySmall" style={styles.statusMessage}>{statusMessage}</Text>
        )}
        <Button
          mode="contained"
          compact
          onPress={handleCheckStatus}
          loading={isChecking}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Check Status
        </Button>
        <Button
          mode="outlined"
          compact
          onPress={() => { logout(); router.replace('/(auth)/login'); }}
          textColor={colors.error}
          icon={() => <HugeiconsIcon icon={Logout01Icon} size={18} color={colors.error} strokeWidth={1.5} />}
          style={styles.logoutButton}
          contentStyle={styles.buttonContent}
        >
          Logout
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusMessage: {
    color: colors.secondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  button: {
    width: '100%',
    borderRadius: 10,
    marginTop: 4,
  },
  logoutButton: {
    width: '100%',
    borderRadius: 10,
    borderColor: colors.error,
  },
  buttonContent: sharedPaperStyles.buttonContent,
});
