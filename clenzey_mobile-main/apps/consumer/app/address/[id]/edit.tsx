import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Address } from '@clenzey/types';
import { createAddressesEndpoints, UpdateAddressPayload } from '@clenzey/api-client';
import { Button, Text } from 'react-native-paper';
import { colors } from '@clenzey/design-system';
import { apiClient } from '../../../src/lib/api';
import { AppDialog } from '../../../src/components/AppDialog';
import { AppConfirmDialog } from '../../../src/components/AppConfirmDialog';
import { MapPicker } from '../../../src/components/MapPicker';
import type { MapPickerRef } from '../../../src/components/map-picker.types';
import { FloatingBackButton } from '../../../src/components/FloatingBackButton';
import { AddressFormFields, addressFormStyles } from '../../../src/components/AddressFormFields';
import { addressSchema, type AddressFormData } from '../../../src/schemas/address';
import { normalizeAddress } from '../../../src/utils/address-response';
import { useAddressLocationHandlers } from '../../../src/hooks/useAddressLocationHandlers';
import { useAddressMapLayout } from '../../../src/hooks/useAddressMapLayout';
import { useMapCurrentLocation } from '../../../src/hooks/useMapCurrentLocation';

const addressesApi = createAddressesEndpoints(apiClient);

const EMPTY_FORM_VALUES: AddressFormData = {
  label: '',
  addressType: 'HOME',
  line1: '',
  line2: undefined,
  landmark: undefined,
  city: '',
  state: '',
  pincode: '',
  latitude: undefined,
  longitude: undefined,
};

function toAddressFormData(address: Address): AddressFormData {
  return {
    label: address.label,
    addressType: address.addressType,
    line1: address.line1,
    line2: address.line2 ?? undefined,
    landmark: address.landmark ?? undefined,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    latitude: address.latitude ?? undefined,
    longitude: address.longitude ?? undefined,
  };
}

export default function EditAddressScreen() {
  const router = useRouter();
  const mapPickerRef = useRef<MapPickerRef>(null);
  const { heroHeight, mapViewHeight, backButtonTop, footerBottomInset, scrollBottomInset } = useAddressMapLayout();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: address, isLoading: isLoadingAddress } = useQuery<Address | null>({
    queryKey: ['addresses', id],
    queryFn: async () => {
      const result = await addressesApi.get(id!);
      const normalized = normalizeAddress(result);
      if (normalized) return normalized;

      const cachedAddresses = queryClient.getQueryData<Address[]>(['addresses']);
      return cachedAddresses?.find((item) => item.id === id) ?? null;
    },
    enabled: !!id,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    getValues,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (address) {
      reset(toAddressFormData(address));
    }
  }, [address, reset]);

  const selectedType = watch('addressType');
  const { handleMapLocationSelect, handlePlaceSelect: applyPlaceSelection } =
    useAddressLocationHandlers(reset, getValues);

  const handlePlaceSelect = useCallback(
    (result: Parameters<typeof applyPlaceSelection>[0]) => {
      applyPlaceSelection(result);
      mapPickerRef.current?.animateToLocation(result.latitude, result.longitude);
    },
    [applyPlaceSelection],
  );

  const { requestCurrentLocation, isLoadingGps } = useMapCurrentLocation({
    onLocationSelect: handleMapLocationSelect,
    animateToLocation: (latitude, longitude) => mapPickerRef.current?.animateToLocation(latitude, longitude),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAddressPayload) =>
      addressesApi.update(id!, data) as unknown as Promise<Address>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    },
    onError: (error: { message?: string }) => {
      setErrorMessage(error.message || 'Failed to update address');
      setErrorDialog(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => addressesApi.delete(id!) as unknown as Promise<void>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      router.back();
    },
    onError: (error: { message?: string }) => {
      setErrorMessage(error.message || 'Failed to delete address');
      setErrorDialog(true);
      setDeleteDialogVisible(false);
    },
  });

  const onSubmit = (data: AddressFormData) => {
    updateMutation.mutate({
      label: data.label,
      addressType: data.addressType,
      line1: data.line1,
      line2: data.line2,
      landmark: data.landmark,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  };

  if (isLoadingAddress) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>Loading address...</Text>
      </View>
    );
  }

  if (!address) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyLarge" style={styles.errorText}>Address not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={addressFormStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[addressFormStyles.mapHero, { height: heroHeight }]}>
        <MapPicker
          ref={mapPickerRef}
          mapHeight={mapViewHeight}
          initialLatitude={watch('latitude') ?? address.latitude ?? undefined}
          initialLongitude={watch('longitude') ?? address.longitude ?? undefined}
          onLocationSelect={handleMapLocationSelect}
        />
        <FloatingBackButton top={backButtonTop} />
      </View>

      <ScrollView
        style={addressFormStyles.scroll}
        contentContainerStyle={[addressFormStyles.content, { paddingBottom: scrollBottomInset }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <AddressFormFields
          key={address.id}
          control={control}
          errors={errors}
          selectedType={selectedType}
          setValue={setValue}
          onPlaceSelect={handlePlaceSelect}
          onUseCurrentLocation={requestCurrentLocation}
          isLoadingCurrentLocation={isLoadingGps}
        />

        <View style={styles.deleteSection}>
          <Button
            mode="outlined"
            compact
            onPress={() => setDeleteDialogVisible(true)}
            loading={deleteMutation.isPending}
            disabled={deleteMutation.isPending || updateMutation.isPending}
            textColor={colors.error}
            style={styles.deleteButton}
            contentStyle={addressFormStyles.saveBtnContent}
          >
            Delete Address
          </Button>
        </View>
      </ScrollView>

      <View style={[addressFormStyles.footer, { paddingBottom: footerBottomInset }]}>
        <Button
          mode="contained"
          compact
          onPress={handleSubmit(onSubmit)}
          loading={updateMutation.isPending}
          disabled={updateMutation.isPending || deleteMutation.isPending}
          buttonColor={colors.primary}
          style={addressFormStyles.saveBtn}
          contentStyle={addressFormStyles.saveBtnContent}
          labelStyle={addressFormStyles.saveBtnLabel}
        >
          Save Changes
        </Button>
      </View>

      <AppConfirmDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        confirmLoading={deleteMutation.isPending}
        showIcon={false}
      />

      <AppDialog
        visible={errorDialog}
        onDismiss={() => setErrorDialog(false)}
        title="Error"
        message={errorMessage}
        type="error"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    gap: 12,
  },
  loadingText: { color: colors.textSecondary },
  errorText: { color: colors.error },
  deleteSection: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  deleteButton: { borderColor: colors.error, borderRadius: 10 },
});
