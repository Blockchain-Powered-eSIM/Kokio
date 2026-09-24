/**
 * On-chain eSIM top-up permission (device wallet -> eSIM wallet fund pull) and
 * the write that flips it.
 *
 * Two hooks:
 *   - useEsimTopupAccess() — reads `canPullFunds(eSIMWalletAddress)` on the
 *                            device wallet sub-package. Requires the
 *                            smart-account-upgraded `Kokio` instance
 *                            (kokio.sdk.deviceWallet), so it stays
 *                            disabled/pending for a fiat-only user or before
 *                            that upgrade lands.
 *   - useToggleEsimTopup() — sends `toggleAccessToFunds(...)` as a real signed
 *                            user operation (fires the passkey/biometric
 *                            prompt) and waits for its receipt before
 *                            confirming the new value into the read query's
 *                            cache.
 *
 * Cache policy (useEsimTopupAccess):
 *   - staleTime  30 s   — permission can change on-chain; short enough to feel live.
 *   - gcTime     5 min  — bounded memory across tab switches.
 *   - enabled           - gated on isActive, a ready device wallet, and a target address.
 *   - refetchOnMount     true — always revalidate when the hook mounts.
 *   - retry              1    — public-RPC rate-limiting is a real failure mode here;
 *                               do not hammer it.
 *
 * Persistence: this query key is NOT in the PERSISTED_KEYS allowlist in
 * providers/index.tsx. An on-chain permission must never be restored from
 * disk and shown as current — it is deliberately in-memory only.
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useKokio } from '@/hooks/useKokio';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { logger } from '@/utils/logger';
import { appendWalletActivityEntry, WALLET_ACTIVITY_KEY } from '@/utils/walletActivity';

// ─── Query key constant ─────────────────────────────────────────────────────────

export const ESIM_TOPUP_ACCESS_KEY = 'esim-topup-access' as const;

// ─── useEsimTopupAccess ─────────────────────────────────────────────────────────

export interface UseEsimTopupAccessResult {
  topupAllowed: boolean | undefined;
  isLoading:    boolean;
  isError:      boolean;
}

/**
 * Returns whether `esimWalletAddress` can currently pull funds from the
 * device wallet.
 *
 * `topupAllowed` is `undefined` while loading or on error — never a
 * placeholder like `false`, since "we could not read the permission" and
 * "the permission is off" are different facts and showing the second when
 * we mean the first is a lie about an on-chain permission. Call sites are
 * responsible for rendering their own loading/fallback UI.
 */
export function useEsimTopupAccess(esimWalletAddress?: string): UseEsimTopupAccessResult {
  const { kokio, ensureSmartAccountUpgraded } = useKokio();
  const isActive  = useIsAppActive();
  const deviceWallet = kokio.sdk?.deviceWallet;

  useEffect(() => {
    if (isActive && !deviceWallet && esimWalletAddress) {
      ensureSmartAccountUpgraded();
    }
  }, [isActive, deviceWallet, esimWalletAddress, ensureSmartAccountUpgraded]);

  const query = useQuery<boolean>({
    queryKey:       [ESIM_TOPUP_ACCESS_KEY, esimWalletAddress],
    queryFn:        async () => {
      if (!deviceWallet || !esimWalletAddress) {
        throw new Error('Top-up access query ran without required inputs');
      }
      try {
        return await deviceWallet.canPullFunds(esimWalletAddress as Address);
      } catch (error) {
        logger.error('ESIM_TOPUP_ACCESS_READ_FAILED', { error });
        throw error;
      }
    },
    enabled:        isActive && !!deviceWallet && !!esimWalletAddress,
    staleTime:      30_000,
    gcTime:         5 * 60_000,
    refetchOnMount: true,
    retry:          1,
  });

  return {
    topupAllowed: query.data,
    isLoading:    query.isLoading,
    isError:      query.isError,
  };
}

// ─── useToggleEsimTopup ─────────────────────────────────────────────────────────

interface ToggleEsimTopupInput {
  esimWalletAddress: string;
  nextValue:         boolean;
  /** Human-readable eSIM name/region, logged into the wallet activity list. */
  label?:            string;
}

/**
 * Flips top-up access for `esimWalletAddress` on-chain. This sends a real,
 * signed user operation (the passkey/biometric prompt fires here) and does
 * NOT report success until the bundler-mined receipt confirms it.
 *
 * No optimistic update: the UI must not flip until `receipt.success` is
 * confirmed, so this mutation deliberately has no `onMutate`.
 */
export function useToggleEsimTopup() {
  const { kokio, ensureSmartAccountUpgraded } = useKokio();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, ToggleEsimTopupInput>({
    mutationFn: async ({ esimWalletAddress, nextValue }) => {
      const sdk = kokio.sdk?.deviceWallet && kokio.sdk?.smartAccountClient
        ? kokio.sdk
        : await ensureSmartAccountUpgraded();
      const deviceWallet = sdk?.deviceWallet;
      const smartAccountClient = sdk?.smartAccountClient;

      if (!deviceWallet || !smartAccountClient) {
        throw new Error('Wallet not ready to change top-up access');
      }

      // Fires the passkey/biometric prompt. Resolves with the user operation
      // hash, NOT a receipt — the write is not confirmed yet.
      const hash = await deviceWallet.toggleAccessToFunds(esimWalletAddress as Address, nextValue);

      const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });

      // A user operation whose calls REVERT still gets mined and still
      // returns a receipt — a resolved promise here is not proof the write
      // worked. `receipt.success` is the only trustworthy signal.
      if (!receipt.success) {
        throw new Error('Top-up access change reverted on-chain');
      }

      return nextValue;
    },
    onSuccess: (nextValue, { esimWalletAddress, label }) => {
      queryClient.setQueryData([ESIM_TOPUP_ACCESS_KEY, esimWalletAddress], nextValue);
      queryClient.invalidateQueries({ queryKey: [ESIM_TOPUP_ACCESS_KEY, esimWalletAddress] });

      if (kokio.deviceUID) {
        appendWalletActivityEntry(kokio.deviceUID, {
          type: nextValue ? 'TOPUP_ACCESS_GRANTED' : 'TOPUP_ACCESS_REVOKED',
          timestamp: Date.now(),
          label,
        })
          .then(() => queryClient.invalidateQueries({ queryKey: [WALLET_ACTIVITY_KEY, kokio.deviceUID] }))
          .catch((err) => logger.error('WALLET_ACTIVITY_LOG_FAILED', { err }));
      }
    },
    onError: (err) => {
      logger.error('ESIM_TOPUP_TOGGLE_FAILED', { err });
    },
  });
}
