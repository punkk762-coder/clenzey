import { useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Address } from '@clenzey/types';
import { createAddressesEndpoints, CreateAddressPayload } from '@clenzey/api-client';
import { Button, Text } from 'react-native-paper';
import { apiClient } from '../../src/lib/api';
import { MapPicker } from '../../src/components/MapPicker';
import type { MapPickerRef } from '../../src/components/map-picker.types';
import { AppDialog } from '../../src/components/AppDialog';
import { FloatingBackButton } from '../../src/components/FloatingBackButton';
import { AddressFormFields, addressFormStyles } from '../../src/components/AddressFormFields';
import { normalizeAddress } from '../../src/utils/address-response';
import { addressSchema, type AddressFormData } from '../../src/schemas/address';
import { colors } from '@clenzey/design-system';
import { useAddressStore } from '../../src/store/address';
import { useAuthStore } from '../../src/store/auth';
import { useAddressLocationHandlers } from '../../src/hooks/useAddressLocationHandlers';
import { useAddressMapLayout } from '../../src/hooks/useAddressMapLayout';
import { useMapCurrentLocation } from '../../src/hooks/useMapCurrentLocation';

const addressesApi = createAddressesEndpoints(apiClient);

export { addressSchema, type AddressFormData } from '../../src/schemas/address';

export default function CreateAddressScreen() {
  const router = useRouter();
  const mapPickerRef = useRef<MapPickerRef>(null);
  const { heroHeight, mapViewHeight, backButtonTop, footerBottomInset, scrollBottomInset } = useAddressMapLayout();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const persistSelectedAddressId = useAddressStore((state) => state.persistSelectedAddressId);
  const queryClient = useQueryClient();
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { control, handleSubmit, formState: { errors }, setValue, watch, reset, getValues } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
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
    },
  });

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

  const createMutation = useMutation({
    mutationFn: (data: CreateAddressPayload) => addressesApi.create(data) as unknown as Promise<Address>,
    onSuccess: async (rawAddress) => {
      const address = normalizeAddress(rawAddress);
      if (!address) {
        setErrorMessage('Failed to save address');
        setErrorDialog(true);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      if (returnTo === 'tabs' || returnTo === 'select') {
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          await persistSelectedAddressId(userId, address.id);
        } else {
          useAddressStore.getState().setSelectedAddressId(address.id);
        }
      }
      if (returnTo === 'tabs') {
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    },
    onError: (error: { message?: string }) => {
      setErrorMessage(error.message || 'Failed to create address');
      setErrorDialog(true);
    },
  });

  const onSubmit = (data: AddressFormData) => {
    createMutation.mutate({
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

  return (
    <KeyboardAvoidingView style={addressFormStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[addressFormStyles.mapHero, { height: heroHeight }]}>
        <MapPicker
          ref={mapPickerRef}
          mapHeight={mapViewHeight}
          initialLatitude={watch('latitude')}
          initialLongitude={watch('longitude')}
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
          control={control}
          errors={errors}
          selectedType={selectedType}
          setValue={setValue}
          onPlaceSelect={handlePlaceSelect}
          onUseCurrentLocation={requestCurrentLocation}
          isLoadingCurrentLocation={isLoadingGps}
        />
      </ScrollView>

      <View style={[addressFormStyles.footer, { paddingBottom: footerBottomInset }]}>
        <Button
          mode="contained"
          compact
          onPress={handleSubmit(onSubmit)}
          loading={createMutation.isPending}
          disabled={createMutation.isPending}
          buttonColor={colors.primary}
          textColor={colors.white}
          style={addressFormStyles.saveBtn}
          contentStyle={addressFormStyles.saveBtnContent}
          labelStyle={addressFormStyles.saveBtnLabel}
        >
          Save Address
        </Button>
      </View>

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
