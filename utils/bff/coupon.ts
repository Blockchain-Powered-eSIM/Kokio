import type { components } from './generated/koKioBff';
import { unwrapBffResponse, BffError } from './koKioBffClient';
import api from '@/services/httpService';
import { logger } from '@/utils/logger';

type IssueCouponRequest = components['schemas']['IssueCouponRequest'];
type CouponDocument     = components['schemas']['CouponDocument'];

export type { IssueCouponRequest, CouponDocument };

export class InvalidCouponCodeError extends Error {
  constructor() { super('Coupon code must be exactly 8 characters'); }
}

export async function getCoupon(code: string): Promise<CouponDocument> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 8) throw new InvalidCouponCodeError();

  logger.debug('[COUPON] Lookup Request', { code: normalized, url: `/v1/coupon/${normalized}` });

  try {
    const doc = await unwrapBffResponse<CouponDocument>(api.get(`/v1/coupon/${normalized}`));
    logger.debug('[COUPON] Lookup Success', {
      code:        normalized,
      balance:     doc.balance,
      tokenName:   doc.tokenName,
      isExhausted: doc.isExhausted,
    });
    return doc;
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

export function issueCoupon(body: IssueCouponRequest): Promise<CouponDocument> {
  return unwrapBffResponse(api.post('/v1/coupon', body as Record<string, unknown>));
}
