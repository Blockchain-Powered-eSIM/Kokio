import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { checkEsimCompatibility } from '@/lib/api/bff/esim';
import type { CompatibilityResponse, CompatibilityResult, CheckCompatibilityParams } from '@/lib/api/bff/esim';
import { ESIM_COMPATIBILITY_KEY } from '@/lib/query-keys';

export type UseEsimCompatibilityParams = {
  planId?: string;
  eSimRef?: string;
};

type ExtraOptions = Omit<
  UseQueryOptions<CompatibilityResponse>,
  'queryKey' | 'queryFn'
>;

// Pulled out as a pure function so the compatible/vendorMismatch/checkError
// partitioning can be unit-tested without standing up react-query.
export function partitionCompatibilityResults(results: CompatibilityResult[] = []) {
  return {
    compatibleEsims:  results.filter(r => r.compatible),
    vendorMismatches: results.filter(r => r.vendorMismatch),
    checkErrors:      results.filter(r => r.checkError),
  };
}

export function useEsimCompatibility(
  params: UseEsimCompatibilityParams,
  options?: ExtraOptions,
) {
  const query = useQuery<CompatibilityResponse>({
    queryKey: [ESIM_COMPATIBILITY_KEY, params.planId, params.eSimRef],
    queryFn:  () => checkEsimCompatibility({ planId: params.planId } as CheckCompatibilityParams, params.eSimRef),
    enabled:  (options?.enabled ?? true) && !!params.planId,
    ...options,
  });

  const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults(query.data?.results);

  return { ...query, compatibleEsims, vendorMismatches, checkErrors };
}
