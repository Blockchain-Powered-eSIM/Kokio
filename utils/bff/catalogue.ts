import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type GetCatalogueParams      = operations['catalogueGetPlans']['parameters']['query'];
type GetPlansParams          = GetCatalogueParams; // backward compat
type CatalogueResponse       = components['schemas']['CatalogueResponse'];
type ServiceRegionsResponse  = components['schemas']['ServiceRegionsResponse'];

export type CataloguePlan = components['schemas']['CataloguePlan'];

export type { GetCatalogueParams, GetPlansParams, CatalogueResponse, ServiceRegionsResponse };

// ─── Catalogue plans ──────────────────────────────────────────────────────────

/* FOR DEVELOPMENT ONLY USE CATALOGUE WITH VENDOR1 filter*/
// export function getCatalogue(params: GetCatalogueParams): Promise<CatalogueResponse> {
//   return unwrapBffResponse(api.get('/v1/catalogue', { ...params, vendor: 'VENDOR1' } as Record<string, unknown>, { ...api.getConfig(), skipAuth: true }));
// }

export function getCatalogue(params: GetCatalogueParams): Promise<CatalogueResponse> {
  return unwrapBffResponse(api.get('/v1/catalogue', params as Record<string, unknown>, { ...api.getConfig(), skipAuth: true }));
}

const CATALOGUE_PAGE_SIZE = 250;

// Fetches every page of a catalogue query. The server default page size is 50,
// so a single call silently truncates larger regions.
export async function getAllCatalogue(params: GetCatalogueParams): Promise<CatalogueResponse> {
  const first = await getCatalogue({ ...params, page: 1, pageSize: CATALOGUE_PAGE_SIZE });
  const plans = [...first.plans];
  for (let page = 2; plans.length < first.total; page++) {
    const next = await getCatalogue({ ...params, page, pageSize: CATALOGUE_PAGE_SIZE });
    if (next.plans.length === 0) break;
    plans.push(...next.plans);
  }
  return { ...first, plans };
}

/** @deprecated Use getCatalogue */
export const getPlans = getCatalogue;

// ─── Service regions (public, cached) ────────────────────────────────────────

const REGIONS_TTL_MS = 5 * 60 * 1000;

interface RegionsCache {
  data: ServiceRegionsResponse;
  expiresAt: number;
}

let _regionsCache: RegionsCache | null = null;

export function clearServiceRegionsCache(): void {
  _regionsCache = null;
}

export async function getServiceRegions(): Promise<ServiceRegionsResponse> {
  if (_regionsCache && Date.now() < _regionsCache.expiresAt) {
    return _regionsCache.data;
  }

  const data = await unwrapBffResponse<ServiceRegionsResponse>(
    api.get('/v1/catalogue/service-regions', {}, { ...api.getConfig(), skipAuth: true }),
  );

  _regionsCache = { data, expiresAt: Date.now() + REGIONS_TTL_MS };
  return data;
}
