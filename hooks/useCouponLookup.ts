import { useQuery } from '@tanstack/react-query';
import { getCoupon } from '@/utils/bff/coupon';
import type { CouponDocument } from '@/utils/bff/coupon';

export function useCouponLookup(code: string, enabled: boolean) {
  const normalizedCode = code.trim().toUpperCase();

  return useQuery<CouponDocument>({
    queryKey: ['coupon', normalizedCode],
    queryFn:  () => getCoupon(normalizedCode),
    enabled:  enabled && normalizedCode.length === 8,
    retry:    false,
  });
}
