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

export function getCatalogue(params: GetCatalogueParams): Promise<CatalogueResponse> {
  return unwrapBffResponse(api.get('/v1/catalogue', params as Record<string, unknown>, { ...api.getConfig(), skipAuth: true }));
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
