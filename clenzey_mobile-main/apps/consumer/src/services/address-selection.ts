import { createAddressesEndpoints } from '@clenzey/api-client';
import type { Address } from '@clenzey/types';
import { apiClient } from '../lib/api';
import { normalizeAddressList } from '../utils/address-response';
import { useAddressStore } from '../store/address';

const addressesApi = createAddressesEndpoints(apiClient);

async function fetchUserAddresses(): Promise<Address[]> {
  const result = await addressesApi.list();
  return normalizeAddressList(result);
}

function pickPreferredAddress(addresses: Address[], storedId: string | null): string | null {
  if (storedId && addresses.some((address) => address.id === storedId)) {
    return storedId;
  }

  const defaultAddress = addresses.find((address) => address.isDefault);
  if (defaultAddress) return defaultAddress.id;

  return addresses[0]?.id ?? null;
}

/**
 * Restores the consumer's delivery address after login or app launch.
 * Uses the persisted choice when still valid, otherwise falls back to default/first address.
 */
export async function syncSelectedAddressForUser(userId: string): Promise<string | null> {
  const { getStoredSelectedAddressId, persistSelectedAddressId, setSelectedAddressId } =
    useAddressStore.getState();

  let storedId = await getStoredSelectedAddressId(userId);

  if (!storedId) {
    const legacyId = await getStoredSelectedAddressId();
    if (legacyId) {
      storedId = legacyId;
      await persistSelectedAddressId(userId, legacyId);
    }
  }

  try {
    const addresses = await fetchUserAddresses();
    const resolvedId = pickPreferredAddress(addresses, storedId);

    if (resolvedId) {
      await persistSelectedAddressId(userId, resolvedId);
      setSelectedAddressId(resolvedId);
      return resolvedId;
    }

    setSelectedAddressId(null);
    return null;
  } catch {
    if (storedId) {
      setSelectedAddressId(storedId);
      return storedId;
    }

    setSelectedAddressId(null);
    return null;
  }
}
