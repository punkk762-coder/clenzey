import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Text, TextInput, Button } from 'react-native-paper';
import { colors } from '@clenzey/design-system';
import { sharedPaperStyles } from '../../src/styles/paperControls';
import { quotationsApi } from '../../src/lib/api';

export const quotationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().min(1, 'Phone number is required').regex(/^\+\d{10,15}$/, 'Phone must be in E.164 format'),
  address: z.string().min(1, 'Address is required').max(500),
  notes: z.string().max(1000).optional(),
  preferredTime: z.string().max(200).optional(),
  serviceId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
});

export type QuotationFormData = z.infer<typeof quotationSchema>;

export default function QuotationCreateScreen() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: { name: '', phone: '+91', address: '', notes: undefined, preferredTime: undefined },
  });

  const createMutation = useMutation({
    mutationFn: (data: QuotationFormData) => quotationsApi.create({
      name: data.name,
      phone: data.phone,
      address: data.address,
      notes: data.notes || undefined,
      preferredTime: data.preferredTime || undefined,
      serviceId: data.serviceId || undefined,
      variantId: data.variantId || undefined,
    }),
    onSuccess: () => {
      Alert.alert('Success', 'Quotation request submitted successfully.', [
        { text: 'OK', onPress: () => router.replace('/quotations') },
      ]);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit quotation request.');
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="headlineSmall" style={styles.heading}>Request Quotation</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Fill in the details and we'll get back to you with a site visit estimate.
          </Text>

          {(['name', 'phone', 'address', 'notes', 'preferredTime'] as const).map((field) => (
            <Controller
              key={field}
              control={control}
              name={field}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label={field === 'name' ? 'Name' : field === 'phone' ? 'Phone' : field === 'address' ? 'Address' : field === 'notes' ? 'Notes (optional)' : 'Preferred Time (optional)'}
                  value={value ?? ''}
                  onChangeText={(text) => onChange(field === 'notes' || field === 'preferredTime' ? (text || undefined) : text)}
                  onBlur={onBlur}
                  error={!!errors[field]}
                  mode="outlined"
                  dense
                  style={styles.input}
                  contentStyle={field === 'address' || field === 'notes' ? undefined : styles.inputContent}
                  multiline={field === 'address' || field === 'notes'}
                  numberOfLines={field === 'address' ? 3 : field === 'notes' ? 4 : 1}
                  keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
                  maxLength={field === 'name' ? 200 : field === 'phone' ? 16 : field === 'address' ? 500 : field === 'notes' ? 1000 : 200}
                />
              )}
            />
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            mode="contained" compact
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onPress={handleSubmit((data) => createMutation.mutate(data))}
            style={styles.submitBtn}
            contentStyle={styles.buttonContent}
          >
            Submit Request
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 24, gap: 4 },
  heading: { color: colors.textPrimary, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, marginBottom: 12, lineHeight: 20 },
  input: { backgroundColor: colors.white, marginBottom: 8, ...sharedPaperStyles.input },
  inputContent: sharedPaperStyles.inputContent,
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: colors.white },
  submitBtn: { borderRadius: 10 },
  buttonContent: sharedPaperStyles.buttonContent,
});
