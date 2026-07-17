import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type CheckCompatibilityParams = operations['esimCheckCompatibility']['parameters']['query'];
type CompatibilityResponse    = components['schemas']['CompatibilityResponse'];
type CompatibilityResult      = components['schemas']['CompatibilityResult'];
type ESimDocument             = components['schemas']['ESimDocument'];
type ESimListResponse         = components['schemas']['ESimListResponse'];
type PlanHistoryEntry         = components['schemas']['PlanHistoryEntry'];
type ESimUsage                = components['schemas']['ESimUsage'];
type ESimUsageResponse        = components['schemas']['ESimUsageResponse'];

export type {
  CheckCompatibilityParams,
  CompatibilityResponse,
  CompatibilityResult,
  ESimDocument,
  ESimListResponse,
  PlanHistoryEntry,
  ESimUsage,
};

export function checkEsimCompatibility(params: CheckCompatibilityParams, esimId?: string): Promise<CompatibilityResponse> {
  const path = esimId ? `/v1/esim/compatibility/${esimId}` : '/v1/esim/compatibility';
  return unwrapBffResponse(api.get(path, params as Record<string, unknown>));
}

export function getEsim(esimId: string): Promise<ESimDocument> {
  return unwrapBffResponse<ESimDocument>(api.get(`/v1/esim/${esimId}`));
}

export function getAllEsims(): Promise<ESimDocument[]> {
  return unwrapBffResponse<ESimListResponse>(api.get('/v1/esim')).then(r => r.eSims);
}

export function getEsimUsage(esimId: string): Promise<ESimUsage> {
  return unwrapBffResponse<ESimUsageResponse>(
    api.get(`/v1/esim/usage/${esimId}`),
  ).then(r => r.usage[0]);
}

/** @deprecated Use checkEsimCompatibility */
export const checkTopUpCompatibility = checkEsimCompatibility;
