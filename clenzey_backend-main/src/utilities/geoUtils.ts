const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two points in meters (Haversine).
 * Used for quick in-memory ranking; PostGIS ST_Distance is preferred for queries.
 */
export const haversineMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

export const isValidLatitude = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;

export const isValidLongitude = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;

export type LngLat = [number, number]; // [lng, lat] — GeoJSON convention
export type Ring = LngLat[];
export type Polygon = Ring[]; // [outer, ...holes]
export type MultiPolygon = Polygon[];

const closeRing = (ring: Ring): Ring => {
  if (ring.length < 3) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
};

const isRingClosed = (ring: Ring): boolean => {
  if (ring.length < 4) return false;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1];
};

/**
 * Validates the structure of a MultiPolygon coordinate array.
 * Returns an error message, or null if valid.
 */
export const validateMultiPolygonCoords = (coords: unknown): null | string => {
  if (!Array.isArray(coords) || coords.length === 0) {
    return "MultiPolygon must contain at least one polygon.";
  }
  for (let i = 0; i < coords.length; i++) {
    const poly = coords[i];
    if (!Array.isArray(poly) || poly.length === 0) {
      return `Polygon ${i} is missing or empty.`;
    }
    for (let r = 0; r < poly.length; r++) {
      const ring = poly[r];
      if (!Array.isArray(ring) || ring.length < 4) {
        return `Polygon ${i} ring ${r} must have at least 4 points (3 distinct + closing).`;
      }
      for (let p = 0; p < ring.length; p++) {
        const pt = ring[p];
        if (!Array.isArray(pt) || pt.length !== 2) {
          return `Polygon ${i} ring ${r} point ${p} must be [lng, lat].`;
        }
        if (!isValidLongitude(pt[0]) || !isValidLatitude(pt[1])) {
          return `Polygon ${i} ring ${r} point ${p} has out-of-range coordinates.`;
        }
      }
      if (!isRingClosed(ring as Ring)) {
        return `Polygon ${i} ring ${r} is not closed (first point must equal last).`;
      }
    }
  }
  return null;
};

/**
 * Builds a GeoJSON MultiPolygon from raw coordinates, auto-closing rings.
 * Caller is responsible for validating before storing.
 */
export const buildMultiPolygonGeoJSON = (coords: MultiPolygon): {
  coordinates: MultiPolygon;
  type: "MultiPolygon";
} => {
  const cleaned: MultiPolygon = coords.map((poly) =>
    poly.map((ring) => closeRing(ring)),
  );
  return { coordinates: cleaned, type: "MultiPolygon" };
};

export const buildPointGeoJSON = (lng: number, lat: number): {
  coordinates: LngLat;
  type: "Point";
} => ({ coordinates: [lng, lat], type: "Point" });

// ── PostGIS-free spatial helpers ─────────────────────────────────────────

/** Extract {lat, lng} from WKT/EWKT POINT string. */
export const parsePointWkt = (
  wkt: string | null | undefined,
): { lat: number; lng: number } | null => {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lat, lng } : null;
};

/** Ray-casting point-in-ring test. */
const isPointInRing = (point: LngLat, ring: Ring): boolean => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
};

/** Check if [lng, lat] is inside a MultiPolygon coordinate array. */
export const isPointInMultiPolygon = (
  point: LngLat,
  coords: MultiPolygon,
): boolean => {
  for (const poly of coords) {
    if (!poly?.[0]) continue;
    if (!isPointInRing(point, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (isPointInRing(point, poly[h]!)) { inHole = true; break; }
    }
    if (!inHole) return true;
  }
  return false;
};

/** Parse WKT/EWKT MULTIPOLYGON or POLYGON into MultiPolygon coords. */
export const parseWktMultiPolygon = (wkt: string | null | undefined): MultiPolygon => {
  if (!wkt) return [];
  const clean = wkt.replace(/^SRID=\d+;/, "").trim();
  const ringMatches = clean.match(/\(\(([\d\s.,+-]+)\)\)/g);
  if (!ringMatches) return [];
  return ringMatches.map((m) => {
    const inner = m.replace(/^\(+|\)+$/g, "");
    return [inner.split(",").map((p) => {
      const [a, b] = p.trim().split(/\s+/).map(Number);
      return [a ?? 0, b ?? 0] as LngLat;
    })];
  });
};
