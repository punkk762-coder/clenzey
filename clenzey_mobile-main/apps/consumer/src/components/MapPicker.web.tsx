import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { locationApi } from '../lib/api';
import { normalizeGeocodedAddress } from '../utils/location-response';
import type { MapPickerRef, MapPickerResult } from './map-picker.types';

export type { MapPickerResult, MapPickerRef } from './map-picker.types';

interface MapPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  onLocationSelect: (result: MapPickerResult) => void;
  mapHeight?: number;
}

type LeafletModule = any;

declare global {
  interface Window {
    L?: any;
  }
}

const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_ID = 'clenzey-leaflet-css';
const LEAFLET_SCRIPT_ID = 'clenzey-leaflet-script';

let leafletLoader: Promise<LeafletModule> | null = null;

function loadLeaflet(): Promise<LeafletModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet is only available in the browser'));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      if (!document.getElementById(LEAFLET_CSS_ID)) {
        const link = document.createElement('link');
        link.id = LEAFLET_CSS_ID;
        link.rel = 'stylesheet';
        link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
        document.head.appendChild(link);
      }

      const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (window.L) resolve(window.L);
          else reject(new Error('Leaflet failed to load'));
        });
        existingScript.addEventListener('error', () => reject(new Error('Leaflet failed to load')));
        return;
      }

      const script = document.createElement('script');
      script.id = LEAFLET_SCRIPT_ID;
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
      script.async = true;
      script.onload = () => {
        if (!window.L) {
          reject(new Error('Leaflet failed to load'));
          return;
        }

        window.L.Icon.Default.mergeOptions({
          iconRetinaUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-icon-2x.png`,
          iconUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-icon.png`,
          shadowUrl: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images/marker-shadow.png`,
        });

        resolve(window.L);
      };
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.body.appendChild(script);
    });
  }

  return leafletLoader;
}

export const MapPicker = forwardRef<MapPickerRef, MapPickerProps>(function MapPicker(
  {
    initialLatitude,
    initialLongitude,
    onLocationSelect,
    mapHeight = 168,
  },
  ref,
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletModule['Map'] | null>(null);
  const markerRef = useRef<LeafletModule['Marker'] | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const notifySelection = useCallback(async (latitude: number, longitude: number) => {
    try {
      const response = await locationApi.reverseGeocode(latitude, longitude);
      onLocationSelectRef.current({ latitude, longitude, address: normalizeGeocodedAddress(response) });
    } catch {
      onLocationSelectRef.current({ latitude, longitude });
    }
  }, []);

  const placeMarker = useCallback((latitude: number, longitude: number, moveMap = false) => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { draggable: true })
        .addTo(map)
        .on('dragend', () => {
          const position = markerRef.current?.getLatLng();
          if (!position) return;
          void notifySelection(position.lat, position.lng);
        });
    }

    if (moveMap) {
      map.setView([latitude, longitude], 15);
    }
  }, [notifySelection]);

  const animateToLocation = useCallback((latitude: number, longitude: number) => {
    placeMarker(latitude, longitude, true);
  }, [placeMarker]);

  useImperativeHandle(ref, () => ({ animateToLocation }), [animateToLocation]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || mapRef.current) return;

        const startLat = initialLatitude ?? DEFAULT_LAT;
        const startLng = initialLongitude ?? DEFAULT_LNG;

        const map = L.map(container, {
          center: [startLat, startLng],
          zoom: 13,
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        map.on('click', (event: any) => {
          const { lat, lng } = event.latlng;
          placeMarker(lat, lng);
          void notifySelection(lat, lng);
        });

        if (initialLatitude != null && initialLongitude != null) {
          placeMarker(initialLatitude, initialLongitude);
        }

        mapRef.current = map;
        setMapReady(true);
      } catch {
        if (!cancelled) {
          Alert.alert('Map Error', 'Unable to load the map. Please refresh and try again.');
        }
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initialLatitude, initialLongitude, notifySelection, placeMarker]);

  useEffect(() => {
    if (initialLatitude != null && initialLongitude != null && mapReady) {
      placeMarker(initialLatitude, initialLongitude);
    }
  }, [initialLatitude, initialLongitude, mapReady, placeMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize();
  }, [mapHeight, mapReady]);

  return (
    <View style={styles.container}>
      <View
        // @ts-expect-error web-only div ref for Leaflet
        ref={mapContainerRef}
        style={[styles.map, { height: mapHeight }, !mapReady && styles.mapLoading]}
      />
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
    zIndex: 0,
  },
  mapLoading: {
    backgroundColor: '#F3F4F6',
  },
});
