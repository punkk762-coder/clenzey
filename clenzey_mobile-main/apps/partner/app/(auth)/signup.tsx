import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TextInput, Button, Text } from 'react-native-paper';
import { AuthBackground, colors, fonts } from '@clenzey/design-system';
import { partnerSignUp } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';
import {
  validateSignupForm,
  validateFullName,
  validateEmail,
  validatePhone,
  validatePassword,
} from '../../src/utils/validation';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { AuthScreenHeader } from '../../src/components/AuthScreenHeader';
import { AppDialog } from '../../src/components/AppDialog';

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const validation = validateSignupForm({ fullName, email, phone, password });
  const showError = (message: string) => {
    setDialogMessage(message);
    setDialogVisible(true);
  };
  const clearField = (field: string) =>
    setFieldErrors((p) => {
      const { [field]: _, ...r } = p;
      return r;
    });

  const handleSubmit = async () => {
    setFieldErrors({});
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setLoading(true);
    try {
      const response = await partnerSignUp({ fullName, email, phone: `+91${phone}`, password });
      useAuthStore.getState().setToken(response.accessToken);
      useAuthStore.getState().setUser(response.user as any);
      router.replace('/(auth)/pending-approval');
    } catch (err: unknown) {
      let msg = 'Sign up failed. Please try again.';
      if (err && typeof err === 'object' && 'message' in err) msg = (err as { message: string }).message;
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground variant="partner">
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <AuthScreenHeader
              title="Partner Sign Up"
              subtitle="Create your professional account to start earning"
            />

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={(t) => { setFullName(t); clearField('fullName'); }}
              onBlur={() => {
                if (fullName) {
                  const e = validateFullName(fullName);
                  if (e) setFieldErrors((p) => ({ ...p, fullName: e }));
                }
              }}
              autoCapitalize="words"
              error={!!fieldErrors.fullName}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            {fieldErrors.fullName ? <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.fullName}</Text> : null}

            <TextInput
              label="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearField('email'); }}
              onBlur={() => {
                if (email) {
                  const e = validateEmail(email);
                  if (e) setFieldErrors((p) => ({ ...p, email: e }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!fieldErrors.email}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
            />
            {fieldErrors.email ? <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.email}</Text> : null}

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '').slice(0, 10)); clearField('phone'); }}
              onBlur={() => {
                if (phone) {
                  const e = validatePhone(phone);
                  if (e) setFieldErrors((p) => ({ ...p, phone: e }));
                }
              }}
              keyboardType="phone-pad"
              maxLength={10}
              error={!!fieldErrors.phone}
              mode="outlined"
              dense
              outlineStyle={styles.inputOutline}
              style={styles.input}
              contentStyle={styles.inputContent}
              left={<TextInput.Affix text="+91" />}
            />
            {fieldErrors.phone ? <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.phone}</Text> : null}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearField('password'); }}
              onBlur={() => {
                if (password) {
                  const e = validatePassword(password);
                  if (e) setFieldErrors((p) => ({ ...p, password: e }));
                }
              }}
              secureTextEntry={!passwordVisible}
              error={!!fieldErrors.password}
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
            {fieldErrors.password ? <Text variant="bodySmall" style={styles.errorText}>{fieldErrors.password}</Text> : null}

            <Button
              mode="contained"
              compact
              onPress={handleSubmit}
              loading={loading}
              disabled={!validation.isValid || loading}
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
          </ScrollView>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  input: { marginBottom: 4, backgroundColor: colors.white, ...sharedPaperStyles.input },
  inputOutline: { borderRadius: 10 },
  inputContent: sharedPaperStyles.inputContent,
  errorText: { color: colors.error, marginBottom: 6, marginLeft: 4 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
  linkButton: { marginTop: 16 },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    lineHeight: 22,
  },
});
