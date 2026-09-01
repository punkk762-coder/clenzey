"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

import { bookingsApi } from "@/lib/api/bookings";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Partner } from "@/types";

/**
 * Fetches booking-eligible partners and handles assignment.
 */
export function usePartnerAssignment(bookingId: string | null): {
  partners: Partner[];
  isLoadingPartners: boolean;
  partnersError: Error | null;
  assign: (partnerId: string) => void;
  isAssigning: boolean;
  assignError: Error | null;
} {
  const queryClient = useQueryClient();

  const {
    data: partners = [],
    isLoading: isLoadingPartners,
    error: partnersError,
  } = useQuery<Partner[], Error>({
    queryKey: ["assignable-partners", bookingId],
    queryFn: async () => bookingsApi.listAssignablePartners(bookingId!),
    enabled: bookingId != null,
  });

  const {
    mutate: assign,
    isPending: isAssigning,
    error: assignError,
  } = useMutation<unknown, Error, string>({
    mutationFn: (partnerId: string) =>
      bookingsApi.assign(bookingId!, partnerId),
    onSuccess: () => {
      toast.success("Partner assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({
        queryKey: ["assignable-partners", bookingId],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to assign partner"));
    },
  });

  return {
    partners,
    isLoadingPartners,
    partnersError: partnersError ?? null,
    assign,
    isAssigning,
    assignError: assignError ?? null,
  };
}
