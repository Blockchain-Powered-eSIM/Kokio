import { useMemo } from 'react';
import { useWalletActivity } from '@/hooks/useWalletActivity';
import { useAccountActivity } from '@/hooks/useAccountActivity';
import {
  walletActivityEntryToDisplayItem,
  activityEntryToDisplayItem,
  type WalletActivityDisplayItem,
} from '@/helpers/walletActivityDisplay';

export interface UseWalletActivityFeedResult {
  entries:   WalletActivityDisplayItem[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

/**
 * Merges the local log (WALLET_DEPLOYED, and SENT - logged the instant a
 * send confirms client-side, real data already in hand) with the
 * webhook-fed server activity feed (GET /account/activity - the only way
 * to learn about a RECEIVED transfer or a PRICE_CAP change, since this
 * device didn't originate those), newest first. A local SENT entry is
 * dropped once the backend's own record of that same transfer (matched by
 * txHash) shows up, so a send doesn't appear twice while cross-device/
 * reinstall history is simply whatever the backend has.
 */
export function useWalletActivityFeed(): UseWalletActivityFeedResult {
  const local  = useWalletActivity();
  const remote = useAccountActivity();

  const entries = useMemo(() => {
    const remoteTxHashes = new Set(remote.entries.map((e) => e.txHash));
    const localRows = local.entries
      .filter((e) => e.type !== 'SENT' || !e.txHash || !remoteTxHashes.has(e.txHash))
      .map((e) => ({ time: e.timestamp, item: walletActivityEntryToDisplayItem(e) }));
    const remoteRows = remote.entries.map((e) => ({ time: new Date(e.time).getTime(), item: activityEntryToDisplayItem(e) }));
    return [...localRows, ...remoteRows]
      .sort((a, b) => b.time - a.time)
      .map((row) => row.item);
  }, [local.entries, remote.entries]);

  return {
    entries,
    isLoading: local.isLoading || remote.isLoading,
    isError:   remote.isError,
    refetch:   remote.refetch,
  };
}
