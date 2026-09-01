export type AddressType = 'HOME' | 'WORK' | 'OTHER';

export interface Address {
  id: string;
  consumerId: string;
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
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
