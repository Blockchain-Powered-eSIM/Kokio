import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type IssueCouponRequest = components['schemas']['IssueCouponRequest'];
type CouponDocument     = components['schemas']['CouponDocument'];

export type { IssueCouponRequest, CouponDocument };

export class InvalidCouponCodeError extends Error {
  constructor() { super('Coupon code must be exactly 8 characters'); }
}

export function getCoupon(code: string): Promise<CouponDocument> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 8) throw new InvalidCouponCodeError();
  return unwrapBffResponse(api.get(`/v1/coupon/${normalized}`));
}

export function issueCoupon(body: IssueCouponRequest): Promise<CouponDocument> {
  return unwrapBffResponse(api.post('/v1/coupon', body as Record<string, unknown>));
}
