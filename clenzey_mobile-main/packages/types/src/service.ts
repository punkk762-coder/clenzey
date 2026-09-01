export type ServiceCategory = 'QUICK_SHINE' | 'DEEP_CLEANING' | 'DEEP_LUXE' | 'CORPORATE';
export type ServiceType = 'B2C' | 'B2B';

export interface ServiceSubVariant {
  id: string;
  label: string;
  value: string;
  basePrice: string;
  sortOrder: number;
  discountedPrice?: string;
  discountPercentage?: number;
}

export interface ServiceVariant {
  id: string;
  label: string;
  value: string;
  basePrice: string;
  sortOrder: number;
  subVariants?: ServiceSubVariant[];
}

export interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price: string;
  sortOrder: number;
}

export interface ServiceInclusion {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  serviceType?: ServiceType;
  description: string;
  tagline: string;
  pricingModel: string;
  isActive: boolean;
  sortOrder: number;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  inclusions: ServiceInclusion[];
  createdAt: string;
  updatedAt: string;
}
