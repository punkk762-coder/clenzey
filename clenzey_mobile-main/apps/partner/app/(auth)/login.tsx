import { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthBackground, colors, SegmentTabs, fonts } from '@clenzey/design-system';
import { createPartnerAuthEndpoints } from '@clenzey/api-client';
import { apiClient, partnerSignIn } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';
import { validateLoginForm } from '../../src/utils/validation';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { AuthScreenHeader } from '../../src/components/AuthScreenHeader';
import { AppDialog } from '../../src/components/AppDialog';

const partnerAuth = createPartnerAuthEndpoints(apiClient);

type AuthMode = 'otp' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('otp');
  const [phone, setPhone] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const validation = validateLoginForm(identifier, password);
  const isPasswordFormValid = validation.isValid;
  const showError = (message: string) => {
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleSendOtp = async () => {
    setOtpError('');
    if (!/^\d{10}$/.test(phone)) {
      setOtpError('Enter a valid 10-digit number');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await partnerAuth.initiate(`+91${phone}`);
      const { token } = response as unknown as { token: string };
      router.push({ pathname: '/(auth)/otp', params: { token, phone: `+91${phone}` } });
    } catch (err: unknown) {
      let msg = 'Failed to send OTP.';
      if (err && typeof err === 'object' && 'message' in err) msg = (err as { message: string }).message;
      showError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!validation.isValid) {
      setIdentifierError(validation.errors.identifier || '');
      setPasswordFieldError(validation.errors.password || '');
      return;
    }
    setPasswordLoading(true);
    try {
      const formattedIdentifier = /^\d{10}$/.test(identifier) ? `+91${identifier}` : identifier;
      const response = await partnerSignIn(formattedIdentifier, password);
      const approvalStatus = response.user?.approvalStatus ?? (response as any).approvalStatus ?? 'APPROVED';
      const userPayload = {
        ...response.user,
        approvalStatus,
      };
      useAuthStore.getState().setToken(response.accessToken);
      useAuthStore.getState().setUser(userPayload as any);
      router.replace(approvalStatus === 'APPROVED' ? '/(tabs)' : '/(auth)/pending-approval');
    } catch (err: unknown) {
      let msg = 'Sign in failed.';
      if (err && typeof err === 'object' && 'message' in err) msg = (err as { message: string }).message;
      showError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleIdentifierBlur = useCallback(() => {
    setIdentifierError(validateLoginForm(identifier, password).errors.identifier || '');
  }, [identifier, password]);

  const handlePasswordBlur = useCallback(() => {
    setPasswordFieldError(validateLoginForm(identifier, password).errors.password || '');
  }, [identifier, password]);

  return (
    <AuthBackground variant="partner">
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.content}>
            <AuthScreenHeader
              title="Partner Login"
              subtitle="Sign in to manage your work and receive assignments"
            />

            <SegmentTabs
              value={mode}
              onValueChange={(v) => setMode(v as AuthMode)}
              tabs={[
                { value: 'otp', label: 'OTP' },
                { value: 'password', label: 'Password' },
              ]}
              variant="plain"
              size="xs"
              style={styles.segmented}
            />

            {mode === 'otp' && (
              <View style={styles.formSection}>
                <TextInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setOtpError(''); }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={!!otpError}
                  mode="outlined"
                  dense
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  left={<TextInput.Affix text="+91" />}
                />
                {otpError ? <Text variant="bodySmall" style={styles.errorText}>{otpError}</Text> : null}
                <Button
                  mode="contained"
                  compact
                  onPress={handleSendOtp}
                  loading={otpLoading}
                  disabled={phone.length !== 10}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Send OTP
                </Button>
              </View>
            )}

            {mode === 'password' && (
              <View style={styles.formSection}>
                <TextInput
                  label="Email or Phone"
                  value={identifier}
                  onChangeText={(t) => { setIdentifier(t); setIdentifierError(''); }}
                  onBlur={handleIdentifierBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={!!identifierError}
                  mode="outlined"
                  dense
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                />
                {identifierError ? <Text variant="bodySmall" style={styles.errorText}>{identifierError}</Text> : null}
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPasswordFieldError(''); }}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!passwordVisible}
                  error={!!passwordFieldError}
                  mode="outlined"
                  dense
                  outlineStyle={styles.inputOutline}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  right={
                    <TextInput.Icon
                      icon={passwordVisible ? 'eye-off' : 'eye'}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                    />
                  }
                />
                {passwordFieldError ? <Text variant="bodySmall" style={styles.errorText}>{passwordFieldError}</Text> : null}
                <Button
                  mode="contained"
                  compact
                  onPress={handlePasswordSignIn}
                  loading={passwordLoading}
                  disabled={!isPasswordFormValid || passwordLoading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Sign In
                </Button>
              </View>
            )}

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/signup')}
              style={styles.linkButton}
              labelStyle={styles.linkLabel}
            >
              Don't have an account? Sign Up
            </Button>
          </View>
        </KeyboardAvoidingView>

        <AppDialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          title="Error"
          message={dialogMessage}
          type="error"
        />
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  segmented: { marginBottom: 24, justifyContent: 'center' },
  formSection: { gap: 6 },
  input: { marginBottom: 4, backgroundColor: colors.white, ...sharedPaperStyles.input },
  inputOutline: { borderRadius: 10 },
  inputContent: sharedPaperStyles.inputContent,
  errorText: { color: colors.error, marginBottom: 8, marginLeft: 4 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
  linkButton: { marginTop: 20 },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    lineHeight: 22,
  },
});
