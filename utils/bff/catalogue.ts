import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type GetPlansParams          = operations['catalogueGetPlans']['parameters']['query'];
type CatalogueResponse       = components['schemas']['CatalogueResponse'];
type ServiceRegionsResponse  = components['schemas']['ServiceRegionsResponse'];

export type { GetPlansParams, CatalogueResponse, ServiceRegionsResponse };
export type { CataloguePlan } from './generated/koKioBff';

export function getPlans(params: GetPlansParams): Promise<CatalogueResponse> {
  return unwrapBffResponse(api.get('/v1/catalogue', params as Record<string, unknown>));
}

export function getServiceRegions(): Promise<ServiceRegionsResponse> {
  return unwrapBffResponse(api.get('/v1/catalogue/service-regions'));
}
