import { AxiosInstance } from 'axios';

/**
 * Address details returned from geocoding and place details endpoints.
 */
export interface GeocodedAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

/**
 * Response from the reverse-geocode endpoint.
 */
export interface ReverseGeocodeResponse {
  address: GeocodedAddress;
  isServiceable: boolean;
}

/**
 * A place prediction returned from the search endpoint.
 */
export interface PlacePrediction {
  placeId: string;
  description: string;
}

/**
 * Response from the places search endpoint.
 */
export interface PlacesSearchResponse {
  predictions?: PlacePrediction[];
  suggestions?: PlacePrediction[];
}

/**
 * Response from the places details endpoint.
 */
export interface PlacesDetailsResponse {
  address: GeocodedAddress;
  latitude: number;
  longitude: number;
}

/**
 * Response from the serviceability check endpoint.
 */
export interface ServiceabilityResponse {
  isServiceable: boolean;
  message?: string;
}

/**
 * Creates the location endpoint module.
 *
 * Provides typed methods for location-related operations:
 * - reverseGeocode: Convert coordinates to an address with serviceability info
 * - placesSearch: Search for places by query string
 * - placesDetails: Get full address and coordinates for a place
 * - serviceability: Check if a location is within the serviceable area
 */
export function createLocationEndpoints(client: AxiosInstance) {
  return {
    /** GET /api/v1/location/reverse-geocode — Reverse-geocode coordinates to address */
    reverseGeocode: (lat: number, lng: number) =>
      client.get<ReverseGeocodeResponse>('/api/v1/location/reverse-geocode', {
        params: { latitude: lat, longitude: lng },
      }),

    /** GET /api/v1/location/places/search — Search for places */
    placesSearch: (query: string) =>
      client.get<PlacesSearchResponse>('/api/v1/location/places/search', {
        params: { query },
      }),

    /** GET /api/v1/location/places/details — Get place details */
    placesDetails: (placeId: string) =>
      client.get<PlacesDetailsResponse>('/api/v1/location/places/details', {
        params: { placeId },
      }),

    /** GET /api/v1/location/serviceability — Check location serviceability */
    serviceability: (lat: number, lng: number) =>
      client.get<ServiceabilityResponse>('/api/v1/location/serviceability', {
        params: { latitude: lat, longitude: lng },
      }),
  };
}
