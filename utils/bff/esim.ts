import type { components, operations } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type CheckCompatibilityParams = operations['esimCheckCompatibility']['parameters']['query'];
type CompatibilityResponse    = components['schemas']['CompatibilityResponse'];
type CompatibilityResult      = components['schemas']['CompatibilityResult'];

export type { CheckCompatibilityParams, CompatibilityResponse, CompatibilityResult };

export interface EsimDetails {
  esimId: string;
  iccid?: string;
  planId?: string;
  orderStatus?: string;
  paymentStatus?: string;
  installationDetails?: {
    qrcode: string;
    appleInstallationUrl: string;
  };
  isNewESim?: boolean;
  vendor?: string;
}

export function checkEsimCompatibility(params: CheckCompatibilityParams): Promise<CompatibilityResponse> {
  return unwrapBffResponse(api.get('/v1/esim/compatibility', params as Record<string, unknown>));
}

export function getEsim(esimId: string): Promise<EsimDetails> {
  return unwrapBffResponse(api.get(`/v1/esim/${esimId}`));
}

export function getAllEsims(): Promise<EsimDetails[]> {
  return unwrapBffResponse(api.get('/v1/esim'));
}

/** @deprecated Use checkEsimCompatibility */
export const checkTopUpCompatibility = checkEsimCompatibility;
