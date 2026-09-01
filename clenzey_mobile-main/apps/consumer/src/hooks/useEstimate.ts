import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../lib/api';

export interface EstimateBreakdownItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

export interface EstimateResult {
  total: number;
  basePrice: number;
  addonsTotal: number;
  breakdown: EstimateBreakdownItem[];
}

export interface EstimateParams {
  serviceId: string | undefined;
  variantId: string | undefined;
  subVariantId?: string;
  addonIds?: string[];
}

export function useEstimate(params: EstimateParams) {
  const { serviceId, variantId, subVariantId, addonIds } = params;

  return useQuery<EstimateResult>({
    queryKey: ['estimate', serviceId, variantId, subVariantId, addonIds],
    queryFn: async () => {
      const result = await servicesApi.estimate(serviceId!, {
        variantId: variantId!,
        subVariantId,
        addonIds,
      });
      // Interceptor unwraps { success, data } → data which is { estimate: {...} }
      return (result as unknown as { estimate: EstimateResult }).estimate;
    },
    enabled: !!serviceId && !!variantId,
  });
}
