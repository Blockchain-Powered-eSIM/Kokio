import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type CheckCompatibilityParams = operations['esimCheckCompatibility']['parameters']['query'];
type CompatibilityResponse    = components['schemas']['CompatibilityResponse'];
type CompatibilityResult      = components['schemas']['CompatibilityResult'];

export type { CheckCompatibilityParams, CompatibilityResponse, CompatibilityResult };

export function checkEsimCompatibility(params: CheckCompatibilityParams): Promise<CompatibilityResponse> {
  return unwrapBffResponse(api.get('/v1/esim/compatibility', params as Record<string, unknown>));
}

/** @deprecated Use checkEsimCompatibility */
export const checkTopUpCompatibility = checkEsimCompatibility;
