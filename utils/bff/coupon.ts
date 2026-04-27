import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type IssueCouponRequest = components['schemas']['IssueCouponRequest'];
type CouponDocument     = components['schemas']['CouponDocument'];

export type { IssueCouponRequest, CouponDocument };

export function getCoupon(code: string): Promise<CouponDocument> {
  return unwrapBffResponse(api.get(`/v1/coupon/${code}`));
}

export function issueCoupon(body: IssueCouponRequest): Promise<CouponDocument> {
  return unwrapBffResponse(api.post('/v1/coupon', body as Record<string, unknown>));
}
