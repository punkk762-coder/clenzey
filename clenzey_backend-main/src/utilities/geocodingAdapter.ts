import axios from "axios";

import { envConfig } from "../configs/environmentConfig.ts";

// ── Simple TTL cache (prevents hammering Google with identical coords) ────────

type CacheEntry<T> = { expiresAt: number; value: T };

function makeCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();
  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) { store.delete(key); return undefined; }
      return entry.value;
    },
    set(key: string, value: T) {
      store.set(key, { expiresAt: Date.now() + ttlMs, value });
    },
  };
}

const reverseGeocodeCache = makeCache<GeocodedAddress>(5 * 60 * 1000); // 5 min
const forwardGeocodeCache = makeCache<GeocodedAddress>(5 * 60 * 1000); // 5 min
const placeDetailsCache = makeCache<GeocodedAddress>(30 * 60 * 1000); // 30 min
const autocompleteCache = makeCache<PlaceSuggestion[]>(2 * 60 * 1000); // 2 min

// Google statuses that mean "API not configured", not "bad input" — fall back to mock in dev only
const CONFIG_ERROR_STATUSES = new Set([
  "REQUEST_DENIED",
  "UNKNOWN_ERROR",
  "OVER_DAILY_LIMIT",
  "OVER_QUERY_LIMIT",
]);

export type GeocodedAddress = {
  city: string;
  country: string;
  formattedAddress: string;
  latitude: number;
  line1: string;
  line2?: string;
  longitude: number;
  pincode: string;
  placeId: string;
  state: string;
};

export type PlaceSuggestion = {
  description: string;
  mainText: string;
  placeId: string;
  secondaryText: string;
};

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const GOOGLE_PLACE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

const pickComponent = (
  components: GoogleAddressComponent[],
  type: string,
): string | undefined => {
  return components.find((c) => c.types.includes(type))?.long_name;
};

const composeLine1 = (components: GoogleAddressComponent[]): string => {
  const street = pickComponent(components, "route");
  const streetNumber = pickComponent(components, "street_number");
  const subloc = pickComponent(components, "sublocality_level_1");
  return [streetNumber, street, subloc].filter(Boolean).join(", ");
};

/**
 * Reverse geocode (lat, lng) → structured address using Google.
 * Falls back to a deterministic stub when GOOGLE_MAPS_API_KEY is not configured
 * (useful in tests / local dev without a billing account).
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<GeocodedAddress> => {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached) return cached;

  if (!envConfig.GOOGLE_MAPS_API_KEY) {
    return mockReverseGeocode(latitude, longitude);
  }

  const { data } = await axios.get<{
    results: {
      address_components: GoogleAddressComponent[];
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    }[];
    status: string;
  }>(GOOGLE_GEOCODE_URL, {
    params: {
      key: envConfig.GOOGLE_MAPS_API_KEY,
      latlng: `${latitude},${longitude}`,
    },
    timeout: 7000,
  });

  if (CONFIG_ERROR_STATUSES.has(data.status)) {
    if (envConfig.NODE_ENV !== "prod") {
      console.warn(`[geocodingAdapter] reverseGeocode fell back to mock: ${data.status}`);
      return mockReverseGeocode(latitude, longitude);
    }
    throw new Error(`Reverse geocode failed: ${data.status}`);
  }
  if (data.status !== "OK" || !data.results.length) {
    throw new Error(`Reverse geocode failed: ${data.status}`);
  }

  const top = data.results[0]!;
  const components = top.address_components;
  const result: GeocodedAddress = {
    city:
      pickComponent(components, "locality") ??
      pickComponent(components, "administrative_area_level_2") ??
      "",
    country: pickComponent(components, "country") ?? "India",
    formattedAddress: top.formatted_address,
    latitude: top.geometry.location.lat,
    line1: composeLine1(components),
    longitude: top.geometry.location.lng,
    pincode: pickComponent(components, "postal_code") ?? "",
    placeId: top.place_id,
    state: pickComponent(components, "administrative_area_level_1") ?? "",
  };
  reverseGeocodeCache.set(cacheKey, result);
  return result;
};

/**
 * Forward geocode (address text / plus code) → structured address using Google.
 * Better suited than autocomplete for resolving full stored addresses.
 */
export const forwardGeocode = async (
  query: string,
): Promise<GeocodedAddress | null> => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toLowerCase();
  const cached = forwardGeocodeCache.get(cacheKey);
  if (cached) return cached;

  if (!envConfig.GOOGLE_MAPS_API_KEY) {
    return mockReverseGeocode(23.0225, 72.5714);
  }

  const { data } = await axios.get<{
    results: {
      address_components: GoogleAddressComponent[];
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    }[];
    status: string;
  }>(GOOGLE_GEOCODE_URL, {
    params: {
      address: trimmed,
      components: "country:in",
      key: envConfig.GOOGLE_MAPS_API_KEY,
    },
    timeout: 7000,
  });

  if (CONFIG_ERROR_STATUSES.has(data.status)) {
    if (envConfig.NODE_ENV !== "prod") {
      console.warn(`[geocodingAdapter] forwardGeocode fell back to mock: ${data.status}`);
      return mockReverseGeocode(23.0225, 72.5714);
    }
    throw new Error(`Forward geocode failed: ${data.status}`);
  }
  if (data.status === "ZERO_RESULTS" || !data.results.length) {
    return null;
  }
  if (data.status !== "OK") {
    throw new Error(`Forward geocode failed: ${data.status}`);
  }

  const top = data.results[0]!;
  const components = top.address_components;
  const result: GeocodedAddress = {
    city:
      pickComponent(components, "locality") ??
      pickComponent(components, "administrative_area_level_2") ??
      "",
    country: pickComponent(components, "country") ?? "India",
    formattedAddress: top.formatted_address,
    latitude: top.geometry.location.lat,
    line1: composeLine1(components),
    longitude: top.geometry.location.lng,
    pincode: pickComponent(components, "postal_code") ?? "",
    placeId: top.place_id,
    state: pickComponent(components, "administrative_area_level_1") ?? "",
  };
  forwardGeocodeCache.set(cacheKey, result);
  return result;
};

export const searchPlaces = async (
  query: string,
  options: { language?: string; sessionToken?: string } = {},
): Promise<PlaceSuggestion[]> => {
  const cacheKey = query.trim().toLowerCase();
  const cached = autocompleteCache.get(cacheKey);
  if (cached) return cached;

  if (!envConfig.GOOGLE_MAPS_API_KEY) {
    return mockSearchPlaces(query);
  }

  const { data } = await axios.get<{
    predictions: {
      description: string;
      place_id: string;
      structured_formatting: { main_text: string; secondary_text: string };
    }[];
    status: string;
  }>(GOOGLE_AUTOCOMPLETE_URL, {
    params: {
      components: "country:in",
      input: query,
      key: envConfig.GOOGLE_MAPS_API_KEY,
      language: options.language ?? "en",
      ...(options.sessionToken && { sessiontoken: options.sessionToken }),
    },
    timeout: 7000,
  });

  if (CONFIG_ERROR_STATUSES.has(data.status)) {
    if (envConfig.NODE_ENV !== "prod") {
      console.warn(`[geocodingAdapter] searchPlaces fell back to mock: ${data.status}`);
      return mockSearchPlaces(query);
    }
    throw new Error(`Place autocomplete failed: ${data.status}`);
  }
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Place autocomplete failed: ${data.status}`);
  }

  const results = data.predictions.map((p) => ({
    description: p.description,
    mainText: p.structured_formatting.main_text,
    placeId: p.place_id,
    secondaryText: p.structured_formatting.secondary_text,
  }));
  // Only cache non-empty results so partial queries re-fetch as the user keeps typing
  if (results.length > 0) autocompleteCache.set(cacheKey, results);
  return results;
};

export const getPlaceDetails = async (
  placeId: string,
): Promise<GeocodedAddress> => {
  const cached = placeDetailsCache.get(placeId);
  if (cached) return cached;

  if (!envConfig.GOOGLE_MAPS_API_KEY) {
    return mockReverseGeocode(28.6139, 77.209, placeId);
  }

  const { data } = await axios.get<{
    result: {
      address_components: GoogleAddressComponent[];
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    };
    status: string;
  }>(GOOGLE_PLACE_DETAILS_URL, {
    params: {
      fields: "address_component,geometry,formatted_address,place_id",
      key: envConfig.GOOGLE_MAPS_API_KEY,
      place_id: placeId,
    },
    timeout: 7000,
  });

  if (CONFIG_ERROR_STATUSES.has(data.status)) {
    if (envConfig.NODE_ENV !== "prod") {
      console.warn(`[geocodingAdapter] getPlaceDetails fell back to mock: ${data.status}`);
      return mockReverseGeocode(28.6139, 77.209, placeId);
    }
    throw new Error(`Place details failed: ${data.status}`);
  }
  if (data.status !== "OK") {
    throw new Error(`Place details failed: ${data.status}`);
  }

  const r = data.result;
  const components = r.address_components;
  const result: GeocodedAddress = {
    city:
      pickComponent(components, "locality") ??
      pickComponent(components, "administrative_area_level_2") ??
      "",
    country: pickComponent(components, "country") ?? "India",
    formattedAddress: r.formatted_address,
    latitude: r.geometry.location.lat,
    line1: composeLine1(components),
    longitude: r.geometry.location.lng,
    pincode: pickComponent(components, "postal_code") ?? "",
    placeId: r.place_id,
    state: pickComponent(components, "administrative_area_level_1") ?? "",
  };
  placeDetailsCache.set(placeId, result);
  return result;
};

// ── Mocks (dev-only fallback) ────────────────────────────────────────────
const mockReverseGeocode = (
  lat: number,
  lng: number,
  placeId = `mock_${lat.toFixed(4)}_${lng.toFixed(4)}`,
): GeocodedAddress => ({
  city: "Bengaluru",
  country: "India",
  formattedAddress: `Approx. location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
  latitude: lat,
  line1: "Unnamed Road",
  longitude: lng,
  pincode: "560001",
  placeId,
  state: "Karnataka",
});

const mockSearchPlaces = (query: string): PlaceSuggestion[] => {
  const base = query.trim();
  if (!base) return [];
  return [
    {
      description: `${base}, Indiranagar, Bengaluru, Karnataka, India`,
      mainText: base,
      placeId: `mock_${base.toLowerCase().replace(/\s+/g, "_")}_1`,
      secondaryText: "Indiranagar, Bengaluru, Karnataka, India",
    },
    {
      description: `${base}, Koramangala, Bengaluru, Karnataka, India`,
      mainText: base,
      placeId: `mock_${base.toLowerCase().replace(/\s+/g, "_")}_2`,
      secondaryText: "Koramangala, Bengaluru, Karnataka, India",
    },
  ];
};
