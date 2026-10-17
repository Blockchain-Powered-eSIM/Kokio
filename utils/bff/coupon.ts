import type { components } from './generated/koKioBff';
import { unwrapBffResponse, BffError } from './koKioBffClient';
import api from '@/services/httpService';
import { logger } from '@/utils/logger';
import { PROMO_CODE_PATTERN } from '@/constants/checkout.constants';

type CodeLookupResponse = components['schemas']['CodeLookupResponse'];

export type { CodeLookupResponse };

export class InvalidCouponCodeError extends Error {
  constructor() { super('Code must be 4 to 16 letters or digits'); }
}

export async function getCoupon(code: string): Promise<CodeLookupResponse> {
  const normalized = code.trim().toUpperCase();
  if (!PROMO_CODE_PATTERN.test(normalized)) throw new InvalidCouponCodeError();

  logger.debug('[COUPON] Lookup Request', { code: normalized, url: `/v1/coupon/${normalized}` });

  try {
    const result = await unwrapBffResponse<CodeLookupResponse>(api.get(`/v1/coupon/${normalized}`));
    logger.debug('[COUPON] Lookup Success', { code: normalized, kind: result.kind });
    return result;
  } catch (err) {
    logger.error('COUPON_LOOKUP_ERROR', {
      code:        normalized,
      url:         `/v1/coupon/${normalized}`,
      errorCode:   err instanceof BffError ? err.code        : 'UNKNOWN',
      httpStatus:  err instanceof BffError ? err.httpStatus  : undefined,
      message:     err instanceof Error    ? err.message     : String(err),
      userMessage: err instanceof BffError ? err.userMessage : undefined,
    });
    throw err;
  }
}
