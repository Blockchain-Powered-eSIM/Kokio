import { useQuery } from '@tanstack/react-query';
import { getCatalogue } from '@/utils/bff/catalogue';
import type { GetCatalogueParams, CatalogueResponse } from '@/utils/bff/catalogue';

const STALE_TIME = 5  * 60 * 1000;
const GC_TIME    = 10 * 60 * 1000;

export function useCatalogue(params: GetCatalogueParams) {
  const { serviceRegionCode, ...filters } = params;
  return useQuery<CatalogueResponse>({
    queryKey: ['catalogue', 'region', serviceRegionCode, filters],
    queryFn:  () => getCatalogue(params),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useCatalogueByCountry(code: string) {
  return useCatalogue({ serviceRegionCode: code });
}

export function useCatalogueByRegion(code: string) {
  return useCatalogue({ serviceRegionCode: code });
}
