import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { checkEsimCompatibility } from '@/utils/bff/esim';
import type { CompatibilityResponse, CompatibilityResult, CheckCompatibilityParams } from '@/utils/bff/esim';

export type UseEsimCompatibilityParams = {
  planId?: string;
  esimId?: string;
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
    queryKey: ['esim-compatibility', params.planId, params.esimId],
    queryFn:  () => checkEsimCompatibility({ planId: params.planId } as CheckCompatibilityParams, params.esimId),
    enabled:  (options?.enabled ?? true) && !!params.planId,
    ...options,
  });

  const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults(query.data?.results);

  return { ...query, compatibleEsims, vendorMismatches, checkErrors };
}
