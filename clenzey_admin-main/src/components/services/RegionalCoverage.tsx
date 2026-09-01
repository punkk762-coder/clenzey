"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { toast } from "@/lib/toast";

import {
  EditableList,
  EditableListEmpty,
  EditableListItem,
} from "@/components/ui/editable-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { zonesApi } from "@/lib/api/zones";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import type { Zone } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegionalCoverageProps {
  serviceId: string;
  assignedZoneIds: string[];
  onUpdate?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegionalCoverage({
  serviceId,
  assignedZoneIds,
  onUpdate,
}: RegionalCoverageProps) {
  const queryClient = useQueryClient();

  // Local state for optimistic chip display
  const [localZoneIds, setLocalZoneIds] = React.useState<string[]>(assignedZoneIds);

  // Sync with prop changes
  React.useEffect(() => {
    setLocalZoneIds(assignedZoneIds);
  }, [assignedZoneIds]);

  // Dropdown / search state
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Confirm remove state
  const [zoneToRemove, setZoneToRemove] = React.useState<Zone | null>(null);

  // ── Fetch all zones ─────────────────────────────────────────────────────────
  const { data: allZones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["zones"],
    queryFn: () => zonesApi.list(),
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const assignedZones = React.useMemo(
    () => allZones.filter((z) => localZoneIds.includes(z.id)),
    [allZones, localZoneIds],
  );

  const availableZones = React.useMemo(() => {
    const unassigned = allZones.filter((z) => !localZoneIds.includes(z.id));
    if (!searchText.trim()) return unassigned;
    const lower = searchText.toLowerCase();
    return unassigned.filter((z) => z.name.toLowerCase().includes(lower));
  }, [allZones, localZoneIds, searchText]);

  // ── Add zone mutation ───────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (zone: Zone) => {
      // Get the current zone data to read existing serviceIds
      const currentZone = await zonesApi.get(zone.id);
      const existingServiceIds = currentZone.services
        ? currentZone.services.filter((s) => s.isAvailable).map((s) => s.serviceId)
        : [];
      // Add our serviceId to the zone's serviceIds
      const updatedServiceIds = [...new Set([...existingServiceIds, serviceId])];
      await zonesApi.update(zone.id, { serviceIds: updatedServiceIds });
    },
    onMutate: (zone) => {
      // Optimistic: add zone to local state
      setLocalZoneIds((prev) => [...prev, zone.id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      onUpdate?.();
    },
    onError: (error, zone) => {
      // Revert optimistic update
      setLocalZoneIds((prev) => prev.filter((id) => id !== zone.id));
      toast.error(getApiErrorMessage(error, "Failed to add region. Please try again."));
    },
  });

  // ── Remove zone mutation ────────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: async (zone: Zone) => {
      // Get the current zone data to read existing serviceIds
      const currentZone = await zonesApi.get(zone.id);
      const existingServiceIds = currentZone.services
        ? currentZone.services.filter((s) => s.isAvailable).map((s) => s.serviceId)
        : [];
      // Remove our serviceId from the zone's serviceIds
      const updatedServiceIds = existingServiceIds.filter(
        (id) => id !== serviceId,
      );
      await zonesApi.update(zone.id, { serviceIds: updatedServiceIds });
    },
    onMutate: (zone) => {
      // Optimistic: remove zone from local state
      setLocalZoneIds((prev) => prev.filter((id) => id !== zone.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      onUpdate?.();
    },
    onError: (error, zone) => {
      // Revert optimistic update
      setLocalZoneIds((prev) => [...prev, zone.id]);
      toast.error(getApiErrorMessage(error, "Failed to remove region. Please try again."));
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddZone = (zone: Zone) => {
    addMutation.mutate(zone);
    setIsDropdownOpen(false);
    setSearchText("");
  };

  const handleRemoveClick = (zone: Zone) => {
    setZoneToRemove(zone);
  };

  const handleConfirmRemove = () => {
    if (zoneToRemove) {
      removeMutation.mutate(zoneToRemove);
      setZoneToRemove(null);
    }
  };

  // ── Close dropdown on outside click ─────────────────────────────────────────
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearchText("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Regional Coverage</h3>
        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={zonesLoading}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Region
          </Button>

          {/* Searchable dropdown */}
          {isDropdownOpen && (
            <div className="menu absolute right-0 top-full z-50 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-0 shadow-lg">
              <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <input
                  autoFocus
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search zones by name…"
                  className="grow bg-transparent text-sm focus:outline-none"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="opacity-60 transition-colors hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto">
                {zonesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                  </div>
                ) : availableZones.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs opacity-60">
                    {searchText
                      ? "No matching zones found"
                      : "All zones are already assigned"}
                  </p>
                ) : (
                  availableZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleAddZone(zone)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-base-200"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{zone.name}</span>
                      <span className="ml-auto text-[10px] opacity-60">
                        {zone.city}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assigned region chips */}
      {assignedZones.length === 0 && !zonesLoading ? (
        <EditableListEmpty message='No regions assigned yet. Click "+ Add Region" to assign coverage zones.' />
      ) : (
        <EditableList>
          {assignedZones.map((zone) => (
            <EditableListItem
              key={zone.id}
              icon={MapPin}
              title={zone.name}
              description={zone.city}
              onRemove={() => handleRemoveClick(zone)}
              removeLabel={`Remove ${zone.name}`}
              className={cn(
                (addMutation.isPending || removeMutation.isPending) && "opacity-70",
              )}
            />
          ))}
          {(addMutation.isPending || removeMutation.isPending) && (
            <div className="flex items-center gap-1 px-1 text-xs text-base-content/55">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </div>
          )}
        </EditableList>
      )}

      {/* Confirm remove dialog */}
      <Dialog
        open={zoneToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setZoneToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Region</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">
                {zoneToRemove?.name}
              </span>{" "}
              from this service&apos;s coverage area? The service will no longer
              be available in this zone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setZoneToRemove(null)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
