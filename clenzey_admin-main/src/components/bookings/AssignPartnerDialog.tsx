"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

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
  EditableList,
  EditableListEmpty,
  EditableListItem,
  SelectableList,
  SelectableListItem,
} from "@/components/ui/editable-list";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { usePartnerAssignment } from "@/hooks/usePartnerAssignment";
import { getApiErrorMessage } from "@/lib/api/errors";

interface AssignPartnerDialogProps {
  bookingId: string | null;
  onClose: () => void;
  onAssigned?: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AssignPartnerDialog({
  bookingId,
  onClose,
  onAssigned,
}: AssignPartnerDialogProps) {
  const { canOperate } = useAdminPermissions();
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<
    string | null
  >(null);

  const {
    partners,
    isLoadingPartners,
    partnersError,
    assign,
    isAssigning,
    assignError,
  } = usePartnerAssignment(bookingId);

  // Reset selection when dialog opens/closes or booking changes
  React.useEffect(() => {
    setSelectedPartnerId(null);
  }, [bookingId]);

  // Track successful assignment to trigger onClose + onAssigned
  const prevIsAssigningRef = React.useRef(isAssigning);
  React.useEffect(() => {
    // When isAssigning transitions from true to false and there's no error,
    // it means the assignment succeeded
    if (prevIsAssigningRef.current && !isAssigning && !assignError) {
      onClose();
      onAssigned?.();
    }
    prevIsAssigningRef.current = isAssigning;
  }, [isAssigning, assignError, onClose, onAssigned]);

  const handleAssign = () => {
    if (!selectedPartnerId || !bookingId) return;
    assign(selectedPartnerId);
  };

  const isOpen = bookingId != null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Partner</DialogTitle>
          <DialogDescription>
            Select an available partner to assign to this booking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {/* Loading state */}
          {isLoadingPartners && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin opacity-60" />
              <span className="ml-2 text-sm opacity-60">
                Loading available partners...
              </span>
            </div>
          )}

          {/* Error fetching partners */}
          {!isLoadingPartners && partnersError && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-error">
                Failed to load partners. Please try again.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingPartners && !partnersError && partners.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm opacity-60">
                No partners are available for this booking&apos;s service and
                time slot.
              </p>
            </div>
          )}

          {/* Partner list */}
          {!isLoadingPartners && !partnersError && partners.length > 0 && (
            <SelectableList role="listbox" aria-label="Available partners">
              {partners.map((partner) => (
                <SelectableListItem
                  key={partner.id}
                  selected={selectedPartnerId === partner.id}
                  onSelect={() => setSelectedPartnerId(partner.id)}
                >
                  <Avatar className="h-9 w-9">
                    {partner.profileImage && (
                      <AvatarImage
                        src={partner.profileImage}
                        alt={partner.fullName ?? "Partner"}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(partner.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {partner.fullName ?? "Unknown Partner"}
                  </span>
                </SelectableListItem>
              ))}
            </SelectableList>
          )}
        </div>

        {/* Assignment error displayed inline */}
        {assignError && (
          <p className="text-sm text-error px-1">
            {getApiErrorMessage(assignError, "Assignment failed. Please try again.")}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !canOperate || !selectedPartnerId || isAssigning || isLoadingPartners
            }
          >
            {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAssigning ? "Assigning..." : "Assign Partner"}
          </Button>
        </DialogFooter>
        {!canOperate && (
          <p className="text-xs text-center opacity-60">
            You need operations access to assign partners.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
