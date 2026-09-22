import { useQuery } from '@tanstack/react-query';
import { getEsimUsage, type ESimUsage } from '@/utils/bff/esim';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/hooks/useAuthRelayer';

// staleTime matches the server-side vendor cache duration (15 min per the spec).
const STALE_TIME = 15 * 60_000;

export interface UseEsimUsageResult {
  usage:             ESimUsage | undefined;
  isLoading:         boolean;
  isError:           boolean;
  usageUnavailable:  boolean;
  refetch:           () => void;
}

/**
 * Returns live remaining usage for a single eSIM.
 *
 * `usageUnavailable` is set when the response arrived but `usageError` is non-null.
 * This is distinct from a network/auth error (`isError`), which indicates the BFF call itself failed.
 * The hook is disabled until `eSimRef` is provided, the app is foregrounded,
 * and the user has an authenticated session.
 */
export function useEsimUsage(eSimRef: string | undefined): UseEsimUsageResult {
  const isActive             = useIsAppActive();
  const { state: authState } = useAuthRelay();

  const query = useQuery<ESimUsage>({
    queryKey:        ['esim-usage', eSimRef],
    queryFn:         () => getEsimUsage(eSimRef!),
    staleTime:       STALE_TIME,
    enabled:         !!eSimRef && isActive && authState.authenticated,
    refetchOnMount:  true,
    refetchInterval: false,
    retry:           1,
  });

  return {
    usage:            query.data,
    isLoading:        query.isLoading,
    isError:          query.isError,
    usageUnavailable: !!query.data?.usageError,
    refetch:          query.refetch,
  };
}
