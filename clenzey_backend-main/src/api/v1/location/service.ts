import {
  forwardGeocode,
  getPlaceDetails,
  reverseGeocode,
  searchPlaces,
} from "../../../utilities/geocodingAdapter.ts";
import * as zonesService from "../zones/service.ts";

export const reverseGeocodeWithServiceability = async (
  latitude: number,
  longitude: number,
) => {
  const [address, serviceability] = await Promise.all([
    reverseGeocode(latitude, longitude),
    zonesService.checkServiceability(latitude, longitude),
  ]);
  return { address, serviceability };
};

export const geocodeAddressQuery = async (query: string) => {
  const address = await forwardGeocode(query);
  if (!address) {
    return { address: null, serviceability: null };
  }

  const serviceability = await zonesService.checkServiceability(
    address.latitude,
    address.longitude,
  );
  return { address, serviceability };
};

export const searchPlacesByQuery = async (
  query: string,
  options: { sessionToken?: string } = {},
) => {
  const suggestions = await searchPlaces(query, options);
  return { suggestions };
};

export const resolvePlace = async (placeId: string) => {
  const address = await getPlaceDetails(placeId);
  const serviceability = await zonesService.checkServiceability(
    address.latitude,
    address.longitude,
  );
  return { address, serviceability };
};

export const checkServiceability = async (
  latitude: number,
  longitude: number,
  serviceId?: string,
) => {
  return await zonesService.checkServiceability(latitude, longitude, serviceId);
};

export const nearbyZones = async (
  latitude: number,
  longitude: number,
  radiusMeters?: number,
) => {
  const results = await zonesService.nearbyZones(
    latitude,
    longitude,
    radiusMeters,
  );
  return results.map((r) => ({
    distanceMeters: r.distanceMeters,
    zone: {
      city: r.zone.city,
      id: r.zone.id,
      name: r.zone.name,
      slug: r.zone.slug,
      tier: r.zone.tier,
    },
  }));
};
