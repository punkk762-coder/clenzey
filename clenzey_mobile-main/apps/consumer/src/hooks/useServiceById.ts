import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../lib/api';
import type { Service } from '@clenzey/types';
import { normalizeService } from '../utils/service-response';

/**
 * React Query hook for fetching a single service by ID.
 * Used on the service detail screen.
 */
export function useServiceById(serviceId: string) {
  return useQuery<Service>({
    queryKey: ['services', serviceId],
    queryFn: async () => {
      const result = await servicesApi.getById(serviceId);
      // Response interceptor unwraps { success, data } → data
      // data shape is { service: {...} }
      const payload = result as unknown as { service: unknown };
      return normalizeService(payload.service);
    },
    enabled: !!serviceId,
  });
}
