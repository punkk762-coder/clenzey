import { useCallback } from 'react';
import { UseFormGetValues, UseFormReset } from 'react-hook-form';
import type { GeocodedAddress } from '@clenzey/api-client';
import type { AddressFormData } from '../schemas/address';
import type { MapPickerResult } from '../components/map-picker.types';
import type { PlaceSearchResult } from '../components/PlaceSearch';

export function useAddressLocationHandlers(
  reset: UseFormReset<AddressFormData>,
  getValues: UseFormGetValues<AddressFormData>,
) {
  const autoFillAddress = useCallback((
    latitude: number,
    longitude: number,
    address?: GeocodedAddress,
    labelSuggestion?: string,
  ) => {
    const current = getValues();
    const hasLabel = Boolean(current.label?.trim());
    const label = labelSuggestion && !hasLabel
      ? labelSuggestion.slice(0, 50)
      : current.label;

    reset(
      {
        ...current,
        latitude,
        longitude,
        label,
        line1: address?.line1 || current.line1,
        line2: address?.line2 ?? current.line2,
        city: address?.city || current.city,
        state: address?.state || current.state,
        pincode: address?.pincode || current.pincode,
      },
      { keepDirty: true },
    );
  }, [reset, getValues]);

  const handleMapLocationSelect = useCallback((result: MapPickerResult) => {
    autoFillAddress(result.latitude, result.longitude, result.address);
  }, [autoFillAddress]);

  const handlePlaceSelect = useCallback((result: PlaceSearchResult) => {
    autoFillAddress(
      result.latitude,
      result.longitude,
      result.address,
      result.labelSuggestion,
    );
  }, [autoFillAddress]);

  return { handleMapLocationSelect, handlePlaceSelect };
}
