import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { checkEsimCompatibility } from '@/utils/bff/esim';
import type { CompatibilityResponse, CheckCompatibilityParams } from '@/utils/bff/esim';

export type UseEsimCompatibilityParams = {
  planId?: string;
  esimId?: string;
};

type ExtraOptions = Omit<
  UseQueryOptions<CompatibilityResponse>,
  'queryKey' | 'queryFn'
>;

export function useEsimCompatibility(
  params: UseEsimCompatibilityParams,
  options?: ExtraOptions,
) {
  const query = useQuery<CompatibilityResponse>({
    queryKey: ['esim-compatibility', params.planId, params.esimId],
    queryFn:  () => checkEsimCompatibility({ planId: params.planId } as CheckCompatibilityParams, params.esimId),
    enabled:  (options?.enabled ?? true) && !!params.planId,
    ...options,
  });

  // Pre-filtered slices callers most commonly need
  const compatibleEsims  = query.data?.results.filter(r => r.compatible)     ?? [];
  const vendorMismatches = query.data?.results.filter(r => r.vendorMismatch)  ?? [];
  const checkErrors      = query.data?.results.filter(r => r.checkError)      ?? [];

  return { ...query, compatibleEsims, vendorMismatches, checkErrors };
}
