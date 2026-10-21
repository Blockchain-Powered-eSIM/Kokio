import { useQuery } from '@tanstack/react-query';
import { getAccountActivity, type ActivityEntry } from '@/utils/bff/account';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthRelay } from '@/hooks/useAuthRelayer';
import { useKokio } from '@/hooks/useKokio';

export const ACCOUNT_ACTIVITY_KEY = 'account-activity' as const;

const STALE_TIME = 60_000;
const GC_TIME    = 5 * 60_000;

export interface UseAccountActivityResult {
  entries:   ActivityEntry[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

/**
 * The device wallet's on-chain activity (GET /account/activity): ETH/ERC-20
 * transfers and eSIM-wallet price-cap changes, newest first, at most 25
 * entries, no pagination. Gated on a deployed device wallet - tracking only
 * starts from deployment, so calling this with no wallet yet always returns
 * empty.
 */
export function useAccountActivity(): UseAccountActivityResult {
  const isActive = useIsAppActive();
  const { state: authState } = useAuthRelay();
  const { kokio } = useKokio();
  const hasDeviceWallet = !!kokio.userWallet;

  const query = useQuery<ActivityEntry[]>({
    queryKey:       [ACCOUNT_ACTIVITY_KEY],
    queryFn:        async () => (await getAccountActivity()).items,
    staleTime:      STALE_TIME,
    gcTime:         GC_TIME,
    enabled:        isActive && authState.authenticated && hasDeviceWallet,
    refetchOnMount: true,
    retry:          1,
  });

  return {
    entries:   query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}
