import { useQuery } from '@tanstack/react-query';
import { getReferral, type ReferralResponse } from '@/utils/bff/account';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/hooks/useAuthRelayer';

export const REFERRAL_KEY = 'account-referral' as const;

export function useReferral() {
  const isActive = useIsAppActive();
  const { state: authState } = useAuthRelay();

  return useQuery<ReferralResponse>({
    queryKey:  [REFERRAL_KEY],
    queryFn:   getReferral,
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
    enabled:   isActive && authState.authenticated,
    retry:     1,
  });
}
