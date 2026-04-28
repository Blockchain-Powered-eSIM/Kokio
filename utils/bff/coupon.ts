import type { components } from './generated/koKioBff';
import { unwrapBffResponse, BffError } from './koKioBffClient';
import api from '@/services/httpService';

type IssueCouponRequest = components['schemas']['IssueCouponRequest'];
type CouponDocument     = components['schemas']['CouponDocument'];

export type { IssueCouponRequest, CouponDocument };

function log(event: string, data?: Record<string, unknown>): void {
  if (__DEV__) console.log('[coupon]', event, data ?? '');
}

export class InvalidCouponCodeError extends Error {
  constructor() { super('Coupon code must be exactly 8 characters'); }
}

export async function getCoupon(code: string): Promise<CouponDocument> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 8) throw new InvalidCouponCodeError();

  log('lookup.request', { code: normalized, url: `/v1/coupon/${normalized}` });

  try {
    const doc = await unwrapBffResponse<CouponDocument>(       
            api.get(                                                 
               `/v1/coupon/${normalized}`,                            
               {},                                                    
               { ...api.getConfig(), dpopHtu: `${api.getBaseURL()}/v1/coupon`},
              ),
            ); 
    // const doc = await unwrapBffResponse<CouponDocument>(api.get(`/v1/coupon/${normalized}`));
    log('lookup.success', {
      code:        normalized,
      balance:     doc.balance,
      tokenName:   doc.tokenName,
      isExhausted: doc.isExhausted,
    });
    return doc;
  } catch (err) {
    log('lookup.error', {
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
