/**
 * Server-truth eSIM state.
 * Authoritative React Query hook for device eSIM documents. Order history is in features/orders/hooks/use-orders.ts.
 *
 * Cache policy:
 *   - staleTime  60 s  — short enough to surface fresh activation-status on tab
 *                        focus without hammering the BFF on every render.
 *   - gcTime     5 min — long enough to survive tab switches while keeping memory bounded.
 *                        AsyncStorage persister (wired in providers/index.tsx) handles cold-boot restore.
 *   - enabled          - gated on isActive AND isAuthenticated.
 *   - refetchOnMount    true     — always revalidate when the hook mounts.
 *   - refetchInterval   false, UNLESS the device wallet is deployed AND at least
 *                                  one eSIM has a non-terminal activationStatus but
 *                                  no esimId yet (its wallet is still being deployed
 *                                  server-side during order fulfilment) — then polls
 *                                  every 15s so the wallet appears without the user
 *                                  needing to background/reopen the app or pull to
 *                                  refresh. Stops on its own once every eSIM either
 *                                  has an esimId or reaches a terminal status.
 *                                  Requiring a deployed device wallet matters: a
 *                                  lazily-purchased eSIM's esimId is backfilled only
 *                                  as part of device-wallet deployment (see the
 *                                  process_wallet_deployments job), so on an account
 *                                  with no device wallet at all this would otherwise
 *                                  poll indefinitely for something that cannot
 *                                  happen yet — confirmed contributing to a real
 *                                  RATE_LIMIT_EXCEEDED.
 *
 * Persistence: the query key is in the PERSISTED_KEYS allowlist in providers/index.tsx.
 * All other query keys (catalogue, health, coupon, compatibility) remain in-memory only.
 */

import { useQuery } from '@tanstack/react-query';
import { getAllEsims, type ESimDocument } from '@/lib/api/bff/esim';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/hooks/useAuthRelayer';
import { useKokio } from '@/hooks/useKokio';
import { DEVICE_ESIMS_KEY } from '@/lib/query-keys';

// ─── Shared cache settings ────────────────────────────────────────────────────

const STALE_TIME = 60_000;          // 1 minute
const GC_TIME    = 5 * 60_000;     // 5 minutes
const PENDING_ESIM_WALLET_POLL_MS = 15_000;

// An eSIM whose wallet deployment (server-side, during order fulfilment) is
// still in flight: not yet terminal, but no on-chain address yet.
function hasPendingEsimWallet(esims: ESimDocument[] | undefined): boolean {
  return !!esims?.some(
    (e) => !e.esimId && (e.activationStatus === 'RELEASED' || e.activationStatus === 'INSTALLED'),
  );
}

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
  const { state: authState } = useAuthRelay();
  const { kokio } = useKokio();
  const hasDeviceWallet = !!kokio.userWallet;

  const query = useQuery<ESimDocument[]>({
    queryKey:          [DEVICE_ESIMS_KEY],
    queryFn:           getAllEsims,
    staleTime:         STALE_TIME,
    gcTime:            GC_TIME,
    enabled:           isActive && authState.authenticated,
    refetchOnMount:    true,
    refetchInterval:   (query) => hasDeviceWallet && hasPendingEsimWallet(query.state.data) ? PENDING_ESIM_WALLET_POLL_MS : false,
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
