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
import {
  EditableListEmpty,
  SelectableList,
  SelectableListItem,
} from "@/components/ui/editable-list";
import { partnersApi } from "@/lib/api/partners";
import { getApiErrorMessage } from "@/lib/api/errors";
import { servicesApi } from "@/lib/api/services";

interface SkillsDialogProps {
  partnerId: string | null;
  currentSkills: string[];
  open: boolean;
  onClose: () => void;
}

export function SkillsDialog({
  partnerId,
  currentSkills,
  open,
  onClose,
}: SkillsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>(
    [],
  );
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      setSelectedServiceIds([...currentSkills]);
      setValidationError(null);
    }
  }, [open, currentSkills]);

  const updateSkills = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      if (!partnerId) throw new Error("No partner selected");
      const toAdd = serviceIds.filter((id) => !currentSkills.includes(id));
      const toRemove = currentSkills.filter((id) => !serviceIds.includes(id));

      if (toAdd.length > 0) {
        await partnersApi.assignSkills(partnerId, toAdd);
      }
      await Promise.all(
        toRemove.map((serviceId) =>
          partnersApi.removeSkill(partnerId, serviceId),
        ),
      );
    },
    onSuccess: () => {
      toast.success("Partner skills updated.");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      if (partnerId) {
        queryClient.invalidateQueries({ queryKey: ["partner", partnerId] });
      }
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update skills. Please try again."));
    },
  });

  const handleToggle = (serviceId: string) => {
    setValidationError(null);
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleSave = () => {
    if (selectedServiceIds.length === 0) {
      setValidationError("At least one service must be selected.");
      return;
    }
    updateSkills.mutate(selectedServiceIds);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Skills</DialogTitle>
          <DialogDescription>
            Assign services this partner is qualified to perform.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
          </div>
        ) : (
          <SelectableList className="py-2 max-h-[40vh] overflow-y-auto">
            {services.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <SelectableListItem
                  key={service.id}
                  selected={isSelected}
                  onSelect={() => handleToggle(service.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    tabIndex={-1}
                    className="checkbox checkbox-primary checkbox-sm pointer-events-none"
                    disabled={updateSkills.isPending}
                  />
                  <span className="text-sm font-medium">{service.name}</span>
                </SelectableListItem>
              );
            })}
            {services.length === 0 && (
              <EditableListEmpty message="No services available." />
            )}
          </SelectableList>
        )}

        {validationError && (
          <p className="text-sm text-error px-1">{validationError}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updateSkills.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateSkills.isPending}>
            {updateSkills.isPending && (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            )}
            Save Skills
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
