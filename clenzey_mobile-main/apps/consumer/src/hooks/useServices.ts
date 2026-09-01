import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../lib/api';
import type { Service } from '@clenzey/types';

/**
 * React Query hook for fetching all available services.
 * Used on the home screen to display service categories.
 */
export function useServices() {
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const result = await servicesApi.list();
      // Response interceptor unwraps { success, data } → data
      // data shape is { services: [...] }
      return (result as unknown as { services: Service[] }).services;
    },
  });
}
