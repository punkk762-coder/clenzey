import { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Address } from '@clenzey/types';
import { createAddressesEndpoints } from '@clenzey/api-client';
import { apiClient } from '../lib/api';
import { useAddressStore } from '../store/address';
import { normalizeAddressList } from '../utils/address-response';

const addressesApi = createAddressesEndpoints(apiClient);

function formatAddressSubtitle(address: Address): string {
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return parts.join(', ');
}

export function useSelectedAddress() {
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);

  const { data: addresses } = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const result = await addressesApi.list();
      return normalizeAddressList(result);
    },
    enabled: !!selectedAddressId,
  });

  const selectedAddress = useMemo(
    () => addresses?.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const locationLabel = selectedAddress
    ? selectedAddress.label || selectedAddress.line1
    : 'Select location';

  const locationSubtitle = selectedAddress ? formatAddressSubtitle(selectedAddress) : undefined;

  return {
    selectedAddressId,
    selectedAddress,
    locationLabel,
    locationSubtitle,
  };
}

export function useLocationHeader() {
  const router = useRouter();
  const { locationLabel, locationSubtitle } = useSelectedAddress();

  const onLocationPress = useCallback(() => {
    router.push('/address/select');
  }, [router]);

  return {
    location: locationLabel,
    locationSubtitle,
    onLocationPress,
  };
}
