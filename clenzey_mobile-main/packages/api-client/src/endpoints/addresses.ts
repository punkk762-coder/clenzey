import { AxiosInstance } from 'axios';
import { Address, AddressType } from '@clenzey/types';

/**
 * Payload for creating a new address.
 */
export interface CreateAddressPayload {
  label: string;
  addressType: AddressType;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Payload for updating an existing address.
 * All fields are optional — only provided fields are updated.
 */
export interface UpdateAddressPayload extends Partial<CreateAddressPayload> {}

/**
 * Creates the addresses endpoint module.
 *
 * Provides typed methods for managing consumer addresses:
 * - list: Fetch all addresses for the current consumer
 * - create: Add a new address
 * - get: Fetch a single address by ID
 * - update: Partially update an address
 * - delete: Remove an address
 * - setDefault: Mark an address as the default
 */
export function createAddressesEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/addresses — List all consumer addresses */
    list: () => client.get<{ addresses: Address[] } | Address[]>('/api/v1/addresses'),

    /** POST /api/v1/addresses — Create a new address */
    create: (data: CreateAddressPayload) =>
      client.post<Address>('/api/v1/addresses', data),

    /** GET /api/v1/addresses/:addressId — Get a single address */
    get: (addressId: string) =>
      client.get<Address>(`/api/v1/addresses/${addressId}`),

    /** PATCH /api/v1/addresses/:addressId — Update an address */
    update: (addressId: string, data: UpdateAddressPayload) =>
      client.patch<Address>(`/api/v1/addresses/${addressId}`, data),

    /** DELETE /api/v1/addresses/:addressId — Delete an address */
    delete: (addressId: string) =>
      client.delete<void>(`/api/v1/addresses/${addressId}`),

    /** POST /api/v1/addresses/:addressId/default — Set address as default */
    setDefault: (addressId: string) =>
      client.post<Address>(`/api/v1/addresses/${addressId}/default`),
  };
}
