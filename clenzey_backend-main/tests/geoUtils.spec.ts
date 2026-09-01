import { describe, expect, it } from "vitest";

import {
  buildMultiPolygonGeoJSON,
  buildPointGeoJSON,
  haversineMeters,
  isValidLatitude,
  isValidLongitude,
  validateMultiPolygonCoords,
} from "../src/utilities/geoUtils.ts";

describe("haversineMeters", () => {
  it("returns zero for identical points", () => {
    const point = { latitude: 12.97, longitude: 77.59 };
    expect(haversineMeters(point, point)).toBe(0);
  });

  it("computes distance between two known points", () => {
    const bangalore = { latitude: 12.9716, longitude: 77.5946 };
    const nearby = { latitude: 12.9816, longitude: 77.6046 };
    const distance = haversineMeters(bangalore, nearby);
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(2000);
  });
});

describe("coordinate validators", () => {
  it("validates latitude bounds", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude("12")).toBe(false);
  });

  it("validates longitude bounds", () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(null)).toBe(false);
  });
});

describe("validateMultiPolygonCoords", () => {
  const validRing: [number, number][] = [
    [77.5, 12.9],
    [77.6, 12.9],
    [77.6, 13.0],
    [77.5, 12.9],
  ];

  it("accepts a valid closed polygon", () => {
    expect(validateMultiPolygonCoords([[validRing]])).toBeNull();
  });

  it("rejects empty input", () => {
    expect(validateMultiPolygonCoords([])).toMatch(/at least one polygon/);
  });

  it("rejects empty polygon in multipolygon", () => {
    expect(validateMultiPolygonCoords([[]])).toMatch(/Polygon 0 is missing or empty/);
  });

  it("rejects rings with bad point format", () => {
    const badPointRing = [
      [77.5, 12.9],
      [77.6, 12.9],
      [77.6],
      [77.5, 12.9],
    ];
    expect(validateMultiPolygonCoords([[badPointRing as [number, number][]]])).toMatch(
      /must be \[lng, lat\]/,
    );
  });

  it("rejects unclosed rings", () => {
    const openRing: [number, number][] = [
      [77.5, 12.9],
      [77.6, 12.9],
      [77.6, 13.0],
      [77.5, 13.0],
    ];
    expect(validateMultiPolygonCoords([[openRing]])).toMatch(/not closed/);
  });

  it("rejects out-of-range coordinates", () => {
    const badRing: [number, number][] = [
      [200, 12.9],
      [77.6, 12.9],
      [77.6, 13.0],
      [200, 12.9],
    ];
    expect(validateMultiPolygonCoords([[badRing]])).toMatch(/out-of-range/);
  });
});

describe("GeoJSON builders", () => {
  it("auto-closes rings in buildMultiPolygonGeoJSON", () => {
    const openRing: [number, number][] = [
      [77.5, 12.9],
      [77.6, 12.9],
      [77.6, 13.0],
    ];
    const geo = buildMultiPolygonGeoJSON([[openRing]]);
    const ring = geo.coordinates[0]![0]!;
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(geo.type).toBe("MultiPolygon");
  });

  it("builds a Point GeoJSON object", () => {
    expect(buildPointGeoJSON(77.59, 12.97)).toEqual({
      coordinates: [77.59, 12.97],
      type: "Point",
    });
  });
});
