import {
  isCorporateB2BService,
  isMisconfiguredCorporateService,
  resolveBookingVariantIds,
  serviceHasCapacityOptions,
  serviceUsesNestedCapacity,
  variantRequiresSubVariant,
} from './service-booking';
import type { Service } from '@clenzey/types';

const flatCorporateService: Service = {
  id: 'corp-1',
  name: 'Corporate Services',
  category: 'CORPORATE',
  serviceType: 'B2B',
  description: '',
  tagline: '',
  pricingModel: 'FIXED',
  isActive: true,
  sortOrder: 0,
  variants: [
    {
      id: 'small',
      label: 'Small (1-15)',
      value: 'small',
      basePrice: '250.00',
      sortOrder: 0,
    },
  ],
  addons: [],
  inclusions: [],
  createdAt: '',
  updatedAt: '',
};

const nestedCorporateService: Service = {
  ...flatCorporateService,
  variants: [
    {
      id: 'office',
      label: 'Office',
      value: 'office',
      basePrice: '0.00',
      sortOrder: 0,
      subVariants: [
        {
          id: 'small',
          label: 'Small',
          value: 'small',
          basePrice: '250.00',
          sortOrder: 0,
        },
      ],
    },
  ],
};

describe('service-booking', () => {
  it('detects corporate B2B services', () => {
    expect(isCorporateB2BService(flatCorporateService)).toBe(true);
    expect(isCorporateB2BService({ category: 'QUICK_SHINE', serviceType: 'B2C' } as Service)).toBe(
      false,
    );
  });

  it('treats flat variants as capacity options', () => {
    expect(serviceUsesNestedCapacity(flatCorporateService)).toBe(false);
    expect(serviceHasCapacityOptions(flatCorporateService)).toBe(true);
    expect(isMisconfiguredCorporateService(flatCorporateService)).toBe(false);
  });

  it('requires explicit sub-variant only for nested capacity', () => {
    expect(variantRequiresSubVariant(nestedCorporateService, nestedCorporateService.variants[0])).toBe(
      true,
    );
    expect(variantRequiresSubVariant(flatCorporateService, flatCorporateService.variants[0])).toBe(
      false,
    );
  });

  it('omits subVariantId when unset or equal to variantId', () => {
    expect(resolveBookingVariantIds('small')).toEqual({
      variantId: 'small',
      subVariantId: undefined,
    });
    expect(resolveBookingVariantIds('small', 'small')).toEqual({
      variantId: 'small',
      subVariantId: undefined,
    });
    expect(resolveBookingVariantIds('office', 'small')).toEqual({
      variantId: 'office',
      subVariantId: 'small',
    });
  });
});
