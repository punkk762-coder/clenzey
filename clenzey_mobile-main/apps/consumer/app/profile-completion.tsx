import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserCircleIcon } from '@hugeicons/core-free-icons';
import { colors, IconCircle, materialStyle } from '@clenzey/design-system';
import { sharedPaperStyles } from '../src/styles/paperControls';
import { AppDialog } from '../src/components/AppDialog';
import { useAuthStore } from '../src/store/auth';
import { normalizeConsumer } from '../src/utils/consumer-response';
import { consumersApi } from '../src/lib/api';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileCompletionScreen() {
  const { setUser } = useAuthStore();
  const [errorVisible, setErrorVisible] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => consumersApi.updateProfile(data),
    onSuccess: (response, variables) => {
      const consumer = normalizeConsumer(response);
      setUser({
        ...consumer,
        fullName: consumer.fullName.trim() || variables.fullName.trim(),
      });
    },
    onError: () => setErrorVisible(true),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <IconCircle icon={UserCircleIcon} size={80} iconSize={40} />
          <Text variant="headlineSmall" style={styles.title}>Complete Your Profile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your full name to get started
          </Text>

          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Full Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.fullName}
                    mode="outlined"
                    dense
                    outlineStyle={styles.inputOutline}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    style={styles.input}
                    contentStyle={styles.inputContent}
                  />
                )}
              />
              {errors.fullName && (
                <Text variant="bodySmall" style={styles.errorText}>{errors.fullName.message}</Text>
              )}
              <Button
                mode="contained" compact
                onPress={handleSubmit((data) => updateProfileMutation.mutate(data))}
                loading={updateProfileMutation.isPending}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                Continue
              </Button>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>

      <AppDialog
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        title="Error"
        message="Failed to save profile. Please try again."
        type="error"
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  title: { color: colors.textPrimary, fontWeight: '700', marginTop: 16 },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  card: { width: '100%', borderRadius: 12, backgroundColor: colors.white, ...materialStyle('card') },
  input: { backgroundColor: colors.chipInactive, marginBottom: 4, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  inputOutline: { borderRadius: 10 },
  errorText: { color: colors.error, marginBottom: 8 },
  submitButton: { marginTop: 16, borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
});
