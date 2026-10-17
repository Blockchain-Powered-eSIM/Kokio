import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getCredit, type CreditHistoryResponse } from '@/utils/bff/account';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/hooks/useAuthRelayer';

export const CREDIT_BALANCE_KEY = 'account-credit-balance' as const;
export const CREDIT_HISTORY_KEY = 'account-credit-history' as const;

const BALANCE_PAGE_SIZE = 1;
const HISTORY_PAGE_SIZE = 25;
const STALE_TIME        = 15_000;
const GC_TIME           = 5 * 60_000;

export function heldCreditCents(
  r: Pick<CreditHistoryResponse, 'balanceCents' | 'availableCents'>,
): number {
  return Math.max(0, r.balanceCents - r.availableCents);
}

export function useCreditBalance() {
  const isActive = useIsAppActive();
  const { state: authState } = useAuthRelay();

  return useQuery<CreditHistoryResponse>({
    queryKey:       [CREDIT_BALANCE_KEY],
    queryFn:        () => getCredit({ page: 1, pageSize: BALANCE_PAGE_SIZE }),
    staleTime:      STALE_TIME,
    gcTime:         GC_TIME,
    enabled:        isActive && authState.authenticated,
    refetchOnMount: true,
    retry:          1,
  });
}

export function useCreditHistory() {
  const isActive = useIsAppActive();
  const { state: authState } = useAuthRelay();

  return useInfiniteQuery<CreditHistoryResponse, Error, CreditHistoryResponse[], string[], number>({
    queryKey:         [CREDIT_HISTORY_KEY],
    queryFn:          ({ pageParam }) => getCredit({ page: pageParam, pageSize: HISTORY_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    select:           (data) => data.pages,
    staleTime:        STALE_TIME,
    gcTime:           GC_TIME,
    enabled:          isActive && authState.authenticated,
    refetchOnMount:   true,
    retry:            1,
  });
}
