"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/RoleGate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commissionApi } from "@/lib/api/partners";
import { getApiErrorMessage } from "@/lib/api/errors";
import { servicesApi } from "@/lib/api/services";
import type { Service } from "@/types";

interface CommissionDialogProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_SERVICES: Service[] = [];

export function CommissionDialog({ open, onClose }: CommissionDialogProps) {
  const queryClient = useQueryClient();
  const [rates, setRates] = React.useState<Record<string, number>>({});
  const [configIds, setConfigIds] = React.useState<Record<string, string>>({});

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
    enabled: open,
  });

  const { data: configsData, isLoading: configsLoading } = useQuery({
    queryKey: ["commission-configs"],
    queryFn: () => commissionApi.list({ activeOnly: false }),
    enabled: open,
  });

  const services = servicesData ?? EMPTY_SERVICES;

  React.useEffect(() => {
    if (!open) {
      setRates({});
      setConfigIds({});
      return;
    }
    if (servicesLoading || configsLoading || !servicesData || !configsData) {
      return;
    }

    const nextRates: Record<string, number> = {};
    const nextIds: Record<string, string> = {};
    for (const service of servicesData) {
      const existing = configsData.find((c) => c.serviceId === service.id);
      nextRates[service.id] = existing?.percentage ?? 0;
      if (existing) nextIds[service.id] = existing.id;
    }
    setRates(nextRates);
    setConfigIds(nextIds);
  }, [open, servicesLoading, configsLoading, servicesData, configsData]);

  const mutation = useMutation({
    mutationFn: async (newRates: Record<string, number>) => {
      const ops = Object.entries(newRates).map(([serviceId, percentage]) => {
        const configId = configIds[serviceId];
        if (configId) {
          return commissionApi.update(configId, { percentage, serviceId });
        }
        return commissionApi.create({ percentage, serviceId, isActive: true });
      });
      await Promise.all(ops);
    },
    onSuccess: () => {
      toast.success("Commission rates updated.");
      queryClient.invalidateQueries({ queryKey: ["commission-configs"] });
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update commission rates."));
    },
  });

  const handleRateChange = (serviceId: string, value: string) => {
    const parsed = parseFloat(value);
    if (value === "" || value === ".") {
      setRates((prev) => ({ ...prev, [serviceId]: 0 }));
      return;
    }
    if (!isNaN(parsed)) {
      setRates((prev) => ({
        ...prev,
        [serviceId]: Math.min(100, Math.max(0, parsed)),
      }));
    }
  };

  const isLoading = servicesLoading || configsLoading;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commission Configuration</DialogTitle>
          <DialogDescription>
            Set platform commission percentage per service.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(rates);
            }}
            className="space-y-4 py-2"
          >
            {services.map((service) => (
              <div key={service.id} className="space-y-1.5">
                <Label htmlFor={`commission-${service.id}`}>{service.name}</Label>
                <div className="relative">
                  <Input
                    id={`commission-${service.id}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={rates[service.id] ?? 0}
                    onChange={(e) =>
                      handleRateChange(service.id, e.target.value)
                    }
                    disabled={mutation.isPending}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <p className="text-sm opacity-60">No services available.</p>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <RoleGate allow="finance">
                <Button type="submit" disabled={mutation.isPending || services.length === 0}>
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Rates
                </Button>
              </RoleGate>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
