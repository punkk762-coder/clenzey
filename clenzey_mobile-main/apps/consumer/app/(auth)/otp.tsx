import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text, TextInput, Button } from 'react-native-paper';
import { colors } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { consumerAuthApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

const RESEND_INTERVAL_SECONDS = 30;

export default function OtpScreen() {
  const { token, phone, referralCode: referralCodeParam } = useLocalSearchParams<{
    token: string;
    phone: string;
    referralCode?: string;
  }>();

  const [otp, setOtp] = useState('');
  const [referralCode, setReferralCode] = useState(referralCodeParam?.trim() ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_INTERVAL_SECONDS);
  const [currentToken, setCurrentToken] = useState(token || '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setToken: storeSetToken, setUser } = useAuthStore();

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = useCallback(() => {
    setResendTimer(RESEND_INTERVAL_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleVerify = async () => {
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const response = await consumerAuthApi.validate(
        currentToken,
        otp,
        referralCode.trim() || undefined,
      );
      const data = response as unknown as {
        accessToken: string;
        isNewUser?: boolean;
        user: { id: string; phone: string; fullName: string; createdAt: string; updatedAt: string };
      };
      storeSetToken(data.accessToken);
      setUser(data.user);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const response = await consumerAuthApi.initiate(phone || '');
      const data = response as unknown as { token: string };
      setCurrentToken(data.token);
      setOtp('');
      setError('');
      startTimer();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to resend OTP. Please try again.';
      setError(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <Image
            source={require('@clenzey/design-system/assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineSmall" style={styles.title}>Verify OTP</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter the 6-digit code sent to {phone}
          </Text>

          <TextInput
            label="OTP Code"
            placeholder="000000"
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/\D/g, '').slice(0, 6));
              if (error) setError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            error={!!error}
            mode="outlined"
            dense
            outlineStyle={styles.inputOutline}
            autoFocus
            style={styles.input}
            contentStyle={styles.inputContent}
          />
          {error ? <Text variant="bodySmall" style={styles.errorText}>{error}</Text> : null}

          <TextInput
            label="Referral Code (optional)"
            placeholder="Enter a friend's code"
            value={referralCode}
            onChangeText={(text) => setReferralCode(text.trim().slice(0, 32))}
            mode="outlined"
            dense
            autoCapitalize="characters"
            maxLength={32}
            outlineStyle={styles.inputOutline}
            style={styles.referralInput}
            contentStyle={styles.inputContent}
          />

          <Button
            mode="contained" compact
            onPress={handleVerify}
            loading={loading}
            disabled={otp.length !== 6}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Verify
          </Button>

          {resendTimer > 0 ? (
            <Text variant="bodySmall" style={styles.resendText}>
              Resend OTP in {resendTimer}s
            </Text>
          ) : (
            <Button mode="text" onPress={handleResend}>Resend OTP</Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 140, height: 44, alignSelf: 'center', marginBottom: 24 },
  title: { color: colors.textPrimary, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: colors.chipInactive, marginBottom: 4, ...sharedPaperStyles.input },
  referralInput: { backgroundColor: colors.chipInactive, marginBottom: 12, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  inputOutline: { borderRadius: 10 },
  errorText: { color: colors.error, marginBottom: 8 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
  resendText: { color: colors.textSecondary, textAlign: 'center', marginTop: 16 },
});
