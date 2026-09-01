import {
  normalizeGeocodedAddress,
  normalizePlaceDetails,
  normalizePlacePredictions,
} from './location-response';

describe('location-response', () => {
  it('normalizes place search suggestions from backend', () => {
    const predictions = normalizePlacePredictions({
      suggestions: [
        {
          placeId: 'place-1',
          description: 'Marine Drive, Mumbai, Maharashtra, India',
          mainText: 'Marine Drive',
          secondaryText: 'Mumbai, Maharashtra, India',
        },
      ],
    });

    expect(predictions).toEqual([
      {
        placeId: 'place-1',
        description: 'Marine Drive, Mumbai, Maharashtra, India',
      },
    ]);
  });

  it('normalizes place details with nested address payload', () => {
    const details = normalizePlaceDetails({
      address: {
        line1: 'Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        country: 'India',
        formattedAddress: 'Marine Drive, Mumbai, Maharashtra 400002, India',
        latitude: 18.9432,
        longitude: 72.8236,
        placeId: 'place-1',
      },
      serviceability: { isServiceable: true },
    });

    expect(details).toEqual({
      latitude: 18.9432,
      longitude: 72.8236,
      address: {
        line1: 'Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        country: 'India',
      },
    });
  });

  it('normalizes reverse-geocode nested address payload', () => {
    const address = normalizeGeocodedAddress({
      address: {
        line1: 'Unnamed Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
        formattedAddress: 'Approx. location (12.97160, 77.59456)',
        latitude: 12.9716,
        longitude: 77.59456,
        placeId: 'mock',
      },
      serviceability: { isServiceable: true },
    });

    expect(address).toEqual({
      line1: 'Unnamed Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    });
  });

  it('falls back to formattedAddress when line1 is missing', () => {
    const address = normalizeGeocodedAddress({
      address: {
        formattedAddress: 'Koramangala, Bengaluru, Karnataka 560034, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560034',
      },
    });

    expect(address?.line1).toBe('Koramangala, Bengaluru, Karnataka 560034, India');
  });
});
