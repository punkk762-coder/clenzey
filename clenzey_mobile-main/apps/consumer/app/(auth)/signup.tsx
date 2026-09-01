import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthBackground, colors, fonts } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { AuthScreenHeader } from '../../src/components/AuthScreenHeader';
import { AppDialog } from '../../src/components/AppDialog';
import { consumerSignUp } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';
import { validateSignupForm } from '../../src/utils/validation';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const { isValid } = validateSignupForm({ email, phone, password });

  const showError = (message: string) => {
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleSubmit = async () => {
    const { isValid: valid, errors } = validateSignupForm({ email, phone, password });
    if (!valid) {
      setEmailError(errors.email || '');
      setPhoneError(errors.phone || '');
      setPasswordError(errors.password || '');
      return;
    }
    setLoading(true);
    try {
      const response = await consumerSignUp({
        email,
        password,
        phone: `+91${phone}`,
        referralCode: referralCode.trim() || undefined,
      });
      useAuthStore.getState().setToken(response.accessToken);
      useAuthStore.getState().setUser(response.user);
    } catch (err: unknown) {
      let message = 'Something went wrong. Please try again.';
      if (err && typeof err === 'object') {
        if ('response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message) {
          message = (err as { response: { data: { message: string } } }).response.data.message;
        } else if ('message' in err) {
          message = (err as { message: string }).message;
        }
      }
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailBlur = useCallback(() => {
    setEmailError(validateSignupForm({ email, phone, password }).errors.email || '');
  }, [email, phone, password]);

  const handlePhoneBlur = useCallback(() => {
    setPhoneError(validateSignupForm({ email, phone, password }).errors.phone || '');
  }, [email, phone, password]);

  const handlePasswordBlur = useCallback(() => {
    setPasswordError(validateSignupForm({ email, phone, password }).errors.password || '');
  }, [email, phone, password]);

  return (
    <AuthBackground variant="consumer">
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.content}>
            <AuthScreenHeader
              title="Create your account"
              subtitle="Join Clenzey and book professional cleaning in just a few taps"
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!emailError}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            {emailError ? <Text variant="bodySmall" style={styles.errorText}>{emailError}</Text> : null}

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
              onBlur={handlePhoneBlur}
              keyboardType="phone-pad"
              maxLength={10}
              error={!!phoneError}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
              left={<TextInput.Affix text="+91" />}
            />
            {phoneError ? <Text variant="bodySmall" style={styles.errorText}>{phoneError}</Text> : null}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
              onBlur={handlePasswordBlur}
              secureTextEntry={!passwordVisible}
              error={!!passwordError}
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
            {passwordError ? <Text variant="bodySmall" style={styles.errorText}>{passwordError}</Text> : null}

            <TextInput
              label="Referral Code (optional)"
              value={referralCode}
              onChangeText={(t) => setReferralCode(t.trim().slice(0, 32))}
              autoCapitalize="characters"
              maxLength={32}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
            />

            <Button
              mode="contained" compact
              onPress={handleSubmit}
              loading={loading}
              disabled={!isValid || loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign Up
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/login')}
              style={styles.linkButton}
              labelStyle={styles.linkLabel}
            >
              Already have an account? Log In
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
  input: { marginBottom: 4, backgroundColor: colors.white, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  inputOutline: { borderRadius: 10 },
  errorText: { color: colors.error, marginBottom: 8, marginLeft: 4 },
  button: { marginTop: 20, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
  linkButton: { marginTop: 20 },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    lineHeight: 22,
  },
});
