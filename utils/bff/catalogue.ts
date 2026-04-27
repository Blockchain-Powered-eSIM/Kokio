import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type GetPlansParams          = operations['catalogueGetPlans']['parameters']['query'];
type CatalogueResponse       = components['schemas']['CatalogueResponse'];
type ServiceRegionsResponse  = components['schemas']['ServiceRegionsResponse'];

export type { GetPlansParams, CatalogueResponse, ServiceRegionsResponse };
export type { CataloguePlan } from './generated/koKioBff';

// ─── Catalogue plans ──────────────────────────────────────────────────────────

export function getPlans(params: GetPlansParams): Promise<CatalogueResponse> {
  return unwrapBffResponse(api.get('/v1/catalogue', params as Record<string, unknown>));
}

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
