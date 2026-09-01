import { GeocodedAddress } from '@clenzey/api-client';

export interface MapPickerResult {
  latitude: number;
  longitude: number;
  address?: GeocodedAddress;
}

export interface MapPickerRef {
  animateToLocation: (latitude: number, longitude: number) => void;
}
