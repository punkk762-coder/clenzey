import { normalizeService } from './service-response';

describe('normalizeService', () => {
  it('normalizes nested sub-variants for corporate services', () => {
    const service = normalizeService({
      id: 'service-1',
      name: 'Corporate Cleaning',
      category: 'CORPORATE',
      description: 'B2B service',
      tagline: '',
      pricingModel: 'PER_SQFT',
      isActive: true,
      sortOrder: 1,
      variants: [
        {
          id: 'variant-office',
          label: 'Office',
          value: 'OFFICE',
          basePrice: '0.00',
          sortOrder: 1,
          sub_variants: [
            {
              id: 'sub-small',
              label: 'Small Office',
              value: 'SMALL',
              basePrice: '120.00',
              sortOrder: 1,
            },
          ],
        },
      ],
      addons: [],
      inclusions: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(service.variants[0].subVariants).toEqual([
      {
        id: 'sub-small',
        label: 'Small Office',
        value: 'SMALL',
        basePrice: '120.00',
        sortOrder: 1,
      },
    ]);
  });
});
