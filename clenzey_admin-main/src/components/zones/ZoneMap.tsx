"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-draw";

import type { GeoJsonObject } from "geojson";

import type { Zone } from "@/types";

// Fix default marker icon URLs for Leaflet in webpack/Next.js bundling.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Mode = "view" | "draw";

type GeoJSONShape = GeoJsonObject;

type ZoneMapProps = {
  mode?: Mode;
  initialBoundary?: number[][][][]; // MultiPolygon coords (lng, lat)
  zones?: Zone[]; // overlay zones in view mode
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  fitBoundsTarget?: [[number, number], [number, number]] | null; // [[south, west], [north, east]]
  previewGeoJSON?: GeoJSONShape | null; // search result polygon preview
  onBoundaryChange?: (boundary: number[][][][]) => void;
};

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '© <a href="https://www.openstreetmap.org/copyright">OSM</a> · © <a href="https://carto.com/attributions">CARTO</a>';

function DrawLayer({
  initialBoundary,
  onBoundaryChange,
}: {
  initialBoundary?: number[][][][];
  onBoundaryChange?: (boundary: number[][][][]) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    const group = new L.FeatureGroup();
    map.addLayer(group);
    groupRef.current = group;

    if (initialBoundary) {
      initialBoundary.forEach((poly) => {
        // Convert [lng,lat] → Leaflet's [lat,lng]
        const latlngs = poly.map((ring) =>
          ring.map(([lng, lat]) => L.latLng(lat, lng)),
        );
        const polygon = L.polygon(latlngs, {
          color: "#d4ff3a",
          weight: 2,
          fillOpacity: 0.18,
        });
        group.addLayer(polygon);
      });
      try {
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
      } catch {
        // bounds may be empty
      }
    }

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#d4ff3a",
            weight: 2,
            fillOpacity: 0.18,
          },
        },
        rectangle: {
          shapeOptions: {
            color: "#d4ff3a",
            weight: 2,
            fillOpacity: 0.18,
          },
        },
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
      },
      edit: { featureGroup: group, remove: true },
    });
    map.addControl(drawControl);

    const emit = () => {
      if (!onBoundaryChange || !groupRef.current) return;
      const coords: number[][][][] = [];
      groupRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs() as L.LatLng[][] | L.LatLng[][][];
          const ringSet = Array.isArray(latlngs[0])
            ? (latlngs as L.LatLng[][])
            : ([latlngs as unknown as L.LatLng[]] as L.LatLng[][]);
          const ring = ringSet.map((r) =>
            r.map((pt) => [pt.lng, pt.lat] as [number, number]),
          );
          // Auto-close ring
          ring.forEach((segment) => {
            if (segment.length > 0) {
              const first = segment[0]!;
              const last = segment[segment.length - 1]!;
              if (first[0] !== last[0] || first[1] !== last[1]) {
                segment.push(first);
              }
            }
          });
          coords.push(ring);
        }
      });
      onBoundaryChange(coords);
    };

    map.on(L.Draw.Event.CREATED as unknown as string, (e: unknown) => {
      const { layer } = e as { layer: L.Layer };
      group.addLayer(layer);
      emit();
    });
    map.on(L.Draw.Event.EDITED as unknown as string, emit);
    map.on(L.Draw.Event.DELETED as unknown as string, emit);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(group);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

function ViewLayer({ zones }: { zones: Zone[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const group = new L.FeatureGroup();
    zones.forEach((zone) => {
      const boundary = zone.boundaryGeoJSON?.coordinates;
      if (!boundary) return;
      boundary.forEach((poly) => {
        const latlngs = poly.map((ring) =>
          ring.map(([lng, lat]) => L.latLng(lat, lng)),
        );
        const color = zone.status === "ACTIVE" ? "#d4ff3a" : "#7eb6c4";
        const polygon = L.polygon(latlngs, {
          color,
          weight: 2,
          fillOpacity: zone.status === "ACTIVE" ? 0.16 : 0.06,
        });
        polygon.bindPopup(
          `<div style="font-family:var(--font-mono);font-size:11px">
            <strong style="font-family:var(--font-sans);font-size:14px;font-weight:600">${zone.name}</strong><br/>
            <span style="color:#8a8b7e">${zone.city}, ${zone.state}</span><br/>
            <span style="color:#8a8b7e">Tier ${zone.tier} · ${zone.status}</span>
          </div>`,
        );
        group.addLayer(polygon);
      });
    });
    map.addLayer(group);
    try {
      if (zones.some((z) => z.boundaryGeoJSON)) {
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
      }
    } catch {
      // ignore
    }
    return () => {
      map.removeLayer(group);
    };
  }, [map, zones]);
  return null;
}

function FitBoundsLayer({
  target,
}: {
  target: [[number, number], [number, number]] | null | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) map.fitBounds(target, { animate: true, padding: [40, 40] });
  }, [map, target]);
  return null;
}

function SearchPreviewLayer({ geojson }: { geojson: GeoJSONShape | null | undefined }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!geojson) return;
    layerRef.current = L.geoJSON(geojson, {
      style: {
        color: "#3b82f6",
        weight: 2,
        opacity: 0.7,
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        dashArray: "6 4",
      },
    }).addTo(map);
  }, [map, geojson]);

  return null;
}

export function ZoneMap({
  mode = "draw",
  initialBoundary,
  zones,
  center = [12.9716, 77.5946],
  zoom = 12,
  fitBoundsTarget,
  previewGeoJSON,
  onBoundaryChange,
}: ZoneMapProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-base-300 bg-base-200">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
        {mode === "draw" ? (
          <>
            <DrawLayer
              initialBoundary={initialBoundary}
              onBoundaryChange={onBoundaryChange}
            />
            <FitBoundsLayer target={fitBoundsTarget} />
            <SearchPreviewLayer geojson={previewGeoJSON} />
          </>
        ) : (
          <ViewLayer zones={zones ?? []} />
        )}
      </MapContainer>
    </div>
  );
}
