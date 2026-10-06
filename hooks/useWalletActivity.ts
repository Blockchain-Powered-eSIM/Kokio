import { useQuery } from '@tanstack/react-query';
import { useKokio } from '@/hooks/useKokio';
import { getWalletActivityEntries, WALLET_ACTIVITY_KEY, type WalletActivityEntry } from '@/utils/walletActivity';

export interface UseWalletActivityResult {
  entries: WalletActivityEntry[];
  isLoading: boolean;
}

/**
 * Reads the local wallet-activity log (see utils/walletActivity.ts) for the
 * current device. Backed by AsyncStorage, not a server call - staleTime 0
 * so a screen re-mounting after an append (invalidated by the writer) always
 * re-reads rather than showing a cached miss from before deviceUID existed.
 */
export function useWalletActivity(): UseWalletActivityResult {
  const { kokio } = useKokio();
  const deviceUID = kokio.deviceUID;

  const query = useQuery<WalletActivityEntry[]>({
    queryKey: [WALLET_ACTIVITY_KEY, deviceUID],
    queryFn: () => getWalletActivityEntries(deviceUID),
    enabled: !!deviceUID,
    staleTime: 0,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
  };
}
