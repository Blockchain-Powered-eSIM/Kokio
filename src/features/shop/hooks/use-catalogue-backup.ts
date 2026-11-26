import { useQuery } from '@tanstack/react-query';
import { getAllCatalogue } from '@/lib/api/bff/catalogue';
import type { CatalogueResponse } from '@/lib/api/bff/catalogue';
import { CATALOGUE_KEY } from '@/lib/query-keys';

const STALE_TIME = 5  * 60 * 1000;
const GC_TIME    = 10 * 60 * 1000;

export function useCatalogueBackup(code: string, enabled: boolean) {
  return useQuery<CatalogueResponse>({
    queryKey: [CATALOGUE_KEY, 'region', code, { includeBackup: true }],
    queryFn:  () => getAllCatalogue({ serviceRegionCode: code, includeBackup: true }),
    enabled:  enabled && !!code,
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}
