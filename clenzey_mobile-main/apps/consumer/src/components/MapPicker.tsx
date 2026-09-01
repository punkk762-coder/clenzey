import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { locationApi } from '../lib/api';
import { normalizeGeocodedAddress } from '../utils/location-response';
import type { MapPickerRef, MapPickerResult } from './map-picker.types';

export type { MapPickerResult, MapPickerRef } from './map-picker.types';

interface MapPickerProps {
  /** Initial latitude to center the map on */
  initialLatitude?: number;
  /** Initial longitude to center the map on */
  initialLongitude?: number;
  /** Callback when a location is selected (marker drag end or GPS location) */
  onLocationSelect: (result: MapPickerResult) => void;
  /** Map viewport height in pixels */
  mapHeight?: number;
}

const DEFAULT_REGION = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

/**
 * MapPicker component wrapping react-native-maps MapView.
 *
 * Features:
 * - Draggable marker for coordinate selection
 * - On marker drag end: updates lat/lng in parent via callback
 */
export const MapPicker = forwardRef<MapPickerRef, MapPickerProps>(function MapPicker(
  {
    initialLatitude,
    initialLongitude,
    onLocationSelect,
    mapHeight = 168,
  },
  ref,
) {
  const [markerCoord, setMarkerCoord] = useState<{ latitude: number; longitude: number } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null,
  );
  const mapRef = useRef<MapView>(null);

  const initialRegion = initialLatitude && initialLongitude
    ? {
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const animateToLocation = useCallback((latitude: number, longitude: number) => {
    setMarkerCoord({ latitude, longitude });
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500,
    );
  }, []);

  useImperativeHandle(ref, () => ({ animateToLocation }), [animateToLocation]);

  useEffect(() => {
    if (initialLatitude != null && initialLongitude != null) {
      setMarkerCoord({ latitude: initialLatitude, longitude: initialLongitude });
    }
  }, [initialLatitude, initialLongitude]);

  const handleMarkerDragEnd = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setMarkerCoord({ latitude, longitude });

      try {
        const response = await locationApi.reverseGeocode(latitude, longitude);
        onLocationSelect({ latitude, longitude, address: normalizeGeocodedAddress(response) });
      } catch {
        onLocationSelect({ latitude, longitude });
      }
    },
    [onLocationSelect],
  );

  const handleMapPress = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setMarkerCoord({ latitude, longitude });

      try {
        const response = await locationApi.reverseGeocode(latitude, longitude);
        onLocationSelect({ latitude, longitude, address: normalizeGeocodedAddress(response) });
      } catch {
        onLocationSelect({ latitude, longitude });
      }
    },
    [onLocationSelect],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height: mapHeight }]}
        initialRegion={initialRegion}
        onPress={handleMapPress}
      >
        {markerCoord && (
          <Marker
            coordinate={markerCoord}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title="Selected Location"
          />
        )}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  map: {
    width: '100%',
  },
});
