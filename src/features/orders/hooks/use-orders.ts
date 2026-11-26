import { useQuery } from '@tanstack/react-query';
import { getOrderList, type OrderListItem } from '@/lib/api/bff/order';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/features/auth/hooks/use-auth-relayer';
import { DEVICE_ORDERS_KEY } from '@/lib/query-keys';

const STALE_TIME = 60_000;          // 1 minute
const GC_TIME    = 5 * 60_000;     // 5 minutes

export interface UseOrdersResult {
  orders:    OrderListItem[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

/**
 * Returns terminal orders for the authenticated device, most-recent-first.
 * Source: GET /order/list (page 1, pageSize 25).
 * Persisted to AsyncStorage via the PersistQueryClientProvider in providers/index.tsx.
 */
export function useOrders(): UseOrdersResult {
  const isActive        = useIsAppActive();
  const { state: authState } = useAuthRelay();

  const query = useQuery<OrderListItem[]>({
    queryKey:          [DEVICE_ORDERS_KEY],
    queryFn:           async () => {
      const response = await getOrderList(1, 25);
      return response.orders;
    },
    staleTime:         STALE_TIME,
    gcTime:            GC_TIME,
    enabled:           isActive && authState.authenticated,
    refetchOnMount:    true,
    refetchInterval:   false,
    retry:             1,
  });

  return {
    orders:    query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}
