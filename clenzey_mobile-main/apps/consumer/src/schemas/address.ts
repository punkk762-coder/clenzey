import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  addressType: z.enum(['HOME', 'WORK', 'OTHER']),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{4,8}$/, 'Pincode must be 4-8 digits'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;
