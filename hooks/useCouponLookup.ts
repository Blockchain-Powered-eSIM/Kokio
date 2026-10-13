import { useQuery } from '@tanstack/react-query';
import { getCoupon } from '@/utils/bff/coupon';
import type { CodeLookupResponse } from '@/utils/bff/coupon';
import { PROMO_CODE_PATTERN, MIN_PROMO_CODE_LOOKUP_LENGTH } from '@/constants/checkout.constants';

export function isLookupableCode(code: string): boolean {
  return code.length >= MIN_PROMO_CODE_LOOKUP_LENGTH && PROMO_CODE_PATTERN.test(code);
}

export function useCouponLookup(code: string, enabled: boolean) {
  const normalizedCode = code.trim().toUpperCase();

  return useQuery<CodeLookupResponse>({
    queryKey: ['coupon', normalizedCode],
    queryFn:  () => getCoupon(normalizedCode),
    enabled:  enabled && isLookupableCode(normalizedCode),
    retry:    false,
  });
}
