import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, Button } from 'react-native-paper';
import { AuthBackground, colors } from '@clenzey/design-system';
import { createPartnerAuthEndpoints } from '@clenzey/api-client';
import type { PartnerValidateResponse } from '@clenzey/api-client';
import { apiClient } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { AuthScreenHeader } from '../../src/components/AuthScreenHeader';

const partnerAuth = createPartnerAuthEndpoints(apiClient);
const RESEND_TIMER_SECONDS = 30;

export default function OtpScreen() {
  const router = useRouter();
  const { token, phone } = useLocalSearchParams<{ token: string; phone: string }>();
  const { setToken, setUser } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setResendTimer(RESEND_TIMER_SECONDS);
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
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;
    setIsResending(true);
    setError('');
    try {
      await partnerAuth.initiate(phone);
      startTimer();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    if (!token) {
      setError('Session expired. Please go back and try again.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await partnerAuth.validate(token, otp, fullName.trim() || undefined);
      const data = response as unknown as PartnerValidateResponse;
      setToken(data.accessToken);
      setUser(data.user);
      switch (data.approvalStatus) {
        case 'APPROVED':
          router.replace('/(tabs)');
          break;
        case 'PENDING':
          router.replace('/(auth)/pending-approval' as never);
          break;
        case 'REJECTED':
          router.replace('/(auth)/rejected');
          break;
        default:
          router.replace('/(tabs)');
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground variant="partner">
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AuthScreenHeader
              title="Verify OTP"
              subtitle={`Enter the 6-digit code sent to ${phone || 'your phone'}`}
            />

            <TextInput
              label="OTP Code"
              placeholder="000000"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
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
              label="Full Name (for new partners)"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            <Text variant="bodySmall" style={styles.helperText}>
              Required if this is your first time signing in
            </Text>

            <Button
              mode="contained"
              compact
              onPress={handleSubmit}
              loading={isLoading}
              disabled={otp.length < 6}
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
              <Button mode="text" onPress={handleResend} loading={isResending}>
                Resend OTP
              </Button>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  input: { backgroundColor: colors.white, marginBottom: 4, ...sharedPaperStyles.input },
  inputOutline: { borderRadius: 10 },
  inputContent: sharedPaperStyles.inputContent,
  errorText: { color: colors.error, marginBottom: 8, marginLeft: 4 },
  helperText: { color: colors.textSecondary, marginBottom: 12, marginLeft: 4 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
  resendText: { color: colors.textSecondary, textAlign: 'center', marginTop: 16 },
});
