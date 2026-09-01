import { buildCorporateSubVariantEstimate, resolveSubVariantPrice } from './corporate-estimate';
import type { ServiceSubVariant, ServiceVariant } from '@clenzey/types';

const variant: ServiceVariant = {
  id: 'medium',
  label: 'Medium (16-50)',
  value: 'medium',
  basePrice: '450.00',
  sortOrder: 1,
};

const subVariant: ServiceSubVariant = {
  id: 'shop',
  label: 'Shop',
  value: 'shop',
  basePrice: '500.00',
  discountedPrice: '450.00',
  discountPercentage: 10,
  sortOrder: 1,
};

describe('corporate-estimate', () => {
  it('detects discounted sub-variant pricing', () => {
    expect(resolveSubVariantPrice(subVariant)).toEqual({
      basePrice: 500,
      effectivePrice: 450,
      discountPercentage: 10,
      hasDiscount: true,
    });
  });

  it('builds a breakdown with discount clarification', () => {
    expect(buildCorporateSubVariantEstimate({ variant, subVariant })).toEqual({
      total: 450,
      basePrice: 450,
      addonsTotal: 0,
      breakdown: [
        { label: 'Shop (Medium (16-50))', amount: 500 },
        {
          label: 'Venue discount (10% off)',
          amount: -50,
          isDiscount: true,
        },
      ],
    });
  });
});
