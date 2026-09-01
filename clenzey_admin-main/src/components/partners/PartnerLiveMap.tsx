"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { PartnerOperationalSnapshot } from "@/lib/api/partnerOperationalStatus";

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '© <a href="https://www.openstreetmap.org/copyright">OSM</a> · © <a href="https://carto.com/attributions">CARTO</a>';

const STATUS_COLOR: Record<string, string> = {
  OFFLINE: "#9ca3af",
  IDLE: "#22c55e",
  IN_TRANSIT: "#3b82f6",
  ON_JOB: "#f59e0b",
};

function FitBounds({
  partners,
}: {
  partners: PartnerOperationalSnapshot[];
}) {
  const map = useMap();
  const points = useMemo(
    () =>
      partners.filter(
        (p) => p.latitude != null && p.longitude != null && p.status !== "OFFLINE",
      ),
    [partners],
  );

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude!, points[0]!.longitude!], 13);
      return;
    }
    const bounds = points.map(
      (p) => [p.latitude!, p.longitude!] as [number, number],
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export function PartnerLiveMap({
  partners,
  selectedPartnerId,
  onSelect,
}: {
  partners: PartnerOperationalSnapshot[];
  selectedPartnerId?: string | null;
  onSelect?: (partnerId: string) => void;
}) {
  const visible = partners.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  return (
    <MapContainer
      center={[23.0225, 72.5714]}
      zoom={11}
      className="h-full w-full rounded-box"
      scrollWheelZoom
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
      <FitBounds partners={visible} />
      {visible.map((p) => {
        const color = STATUS_COLOR[p.status] ?? STATUS_COLOR.OFFLINE;
        const selected = p.partnerId === selectedPartnerId;
        return (
          <CircleMarker
            key={p.partnerId}
            center={[p.latitude!, p.longitude!]}
            radius={selected ? 10 : 7}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: p.status === "OFFLINE" ? 0.35 : 0.85,
              weight: selected ? 3 : 1,
            }}
            eventHandlers={{
              click: () => onSelect?.(p.partnerId),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-medium">{p.fullName ?? "Partner"}</p>
                <p className="opacity-70">{p.status.replaceAll("_", " ")}</p>
                {p.activeBookingNumber ? (
                  <p className="mt-1 text-xs">Booking {p.activeBookingNumber}</p>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
