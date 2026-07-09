/**
 * Server-truth eSIM and order state.
 * Authoritative React Query hooks for device eSIM documents and terminal order history.
 *
 * Distinct from queries/e-sims.ts, which owns catalogue (plan-discovery) queries.
 * The two query namespaces are independent:
 *   - queries/e-sims.ts  ->  catalogue plans  (key root: "esims")
 *   - queries/esims.ts   ->  device eSIM docs (key root: "device-esims" / "device-orders")
 *
 * Cache policy:
 *   - staleTime  60 s  — short enough to surface fresh activation-status on tab
 *                        focus without hammering the BFF on every render.
 *   - gcTime     5 min — long enough to survive tab switches while keeping memory bounded.
 *                        AsyncStorage persister (wired in providers/index.tsx) handles cold-boot restore.
 *   - enabled          - gated on isActive AND isAuthenticated.
 *   - refetchOnMount    true     — always revalidate when the hook mounts.
 *   - refetchInterval   false    — App-return triggers the isActive gate flip which React Query's
 *                                  enabled logic translates into a refetch.
 *
 * Persistence: Both query keys are in the PERSISTED_KEYS allowlist in providers/index.tsx.
 * All other query keys (catalogue, health, coupon, compatibility) remain in-memory only.
 */

import { useQuery } from '@tanstack/react-query';
import { getAllEsims, type ESimDocument } from '@/utils/bff/esim';
import { getOrderList, type OrderListItem } from '@/utils/bff/order';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthStore } from '@/stores/authStore';

// ─── Query key constants ───────────────────────────────────────────────────────

export const DEVICE_ESIMS_KEY  = 'device-esims'  as const;
export const DEVICE_ORDERS_KEY = 'device-orders' as const;

// ─── Shared cache settings ────────────────────────────────────────────────────

const STALE_TIME = 60_000;          // 1 minute
const GC_TIME    = 5 * 60_000;     // 5 minutes

// ─── useEsims ─────────────────────────────────────────────────────────────────

export interface UseEsimsResult {
  esims:     ESimDocument[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

/**
 * Returns all eSIM documents associated with the authenticated device.
 * Source: GET /esim (no params — server returns all activation statuses).
 * Persisted to AsyncStorage via the PersistQueryClientProvider in providers/index.tsx.
 * The last-known list is available immediately on cold boot.
 */
export function useEsims(): UseEsimsResult {
  const isActive          = useIsAppActive();
  const isAuthenticated   = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery<ESimDocument[]>({
    queryKey:          [DEVICE_ESIMS_KEY],
    queryFn:           getAllEsims,
    staleTime:         STALE_TIME,
    gcTime:            GC_TIME,
    enabled:           isActive && isAuthenticated,
    refetchOnMount:    true,
    refetchInterval:   false,
    // On a network failure serve whatever is in cache.
    retry:             1,
  });

  return {
    esims:     query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}

// ─── useOrders ────────────────────────────────────────────────────────────────

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery<OrderListItem[]>({
    queryKey:          [DEVICE_ORDERS_KEY],
    queryFn:           async () => {
      const response = await getOrderList(1, 25);
      return response.orders;
    },
    staleTime:         STALE_TIME,
    gcTime:            GC_TIME,
    enabled:           isActive && isAuthenticated,
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
