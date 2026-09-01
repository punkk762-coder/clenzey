import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { locationApi } from '../lib/api';
import { normalizeGeocodedAddress } from '../utils/location-response';
import type { MapPickerResult } from '../components/map-picker.types';

interface UseMapCurrentLocationOptions {
  onLocationSelect: (result: MapPickerResult) => void;
  animateToLocation?: (latitude: number, longitude: number) => void;
}

export function useMapCurrentLocation({
  onLocationSelect,
  animateToLocation,
}: UseMapCurrentLocationOptions) {
  const [isLoadingGps, setIsLoadingGps] = useState(false);

  const requestCurrentLocation = useCallback(async () => {
    setIsLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use current location. Please enable it in your device settings.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;
      animateToLocation?.(latitude, longitude);

      try {
        const response = await locationApi.reverseGeocode(latitude, longitude);
        onLocationSelect({ latitude, longitude, address: normalizeGeocodedAddress(response) });
      } catch {
        onLocationSelect({ latitude, longitude });
      }
    } catch {
      Alert.alert('Location Error', 'Unable to get current location. Please try again.');
    } finally {
      setIsLoadingGps(false);
    }
  }, [animateToLocation, onLocationSelect]);

  return { requestCurrentLocation, isLoadingGps };
}
