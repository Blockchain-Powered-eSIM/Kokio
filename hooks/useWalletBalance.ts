/**
 * On-chain USDC balance for a wallet address (device wallet or eSIM wallet).
 *
 * Two queries:
 *   - useUsdcAsset()     — resolves the USDC `Asset` (token address, decimals) from the
 *                          on-chain PaymentAdapter registry. Registration doesn't change
 *                          at runtime, so this is cached indefinitely once resolved.
 *   - useWalletBalance() — reads `balanceOf(address)` on the resolved USDC token via the
 *                          smart account client's bundled `readContract` (splits
 *                          `eth_call` to the app's real RPC), gated on the asset query.
 *
 * Cache policy (useWalletBalance):
 *   - staleTime  30 s   — balance can move on-chain; short enough to feel live.
 *   - gcTime     5 min  — bounded memory across tab switches.
 *   - enabled           - gated on isActive, a ready smart account client, a resolved
 *                          USDC token address, and a target address.
 *   - refetchOnMount     true — always revalidate when the hook mounts.
 *   - retry              1    — public-RPC rate-limiting is a real failure mode here;
 *                               do not hammer it.
 *
 * Persistence: NEITHER query key is in the PERSISTED_KEYS allowlist in providers/index.tsx.
 * An on-chain balance must never be restored from disk and shown as current — both
 * queries are deliberately in-memory only.
 */

import { useQuery } from '@tanstack/react-query';
import { erc20Abi, stringToHex, type Address } from 'viem';
import type { Asset } from 'kokio-sdk/types';
import { useKokio } from '@/hooks/useKokio';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { logger } from '@/utils/logger';

// ─── Query key constants ───────────────────────────────────────────────────────

export const USDC_ASSET_KEY    = 'usdc-asset'    as const;
export const WALLET_BALANCE_KEY = 'wallet-balance' as const;

// ─── Formatting ─────────────────────────────────────────────────────────────────

// Truncates rather than rounds: a displayed balance must never overstate
// what the wallet actually holds.
function formatUsdcAmount(raw: bigint, decimals: number): string {
  if (decimals < 2) return raw.toString();
  const cents = (raw * 100n) / 10n ** BigInt(decimals);
  const whole = cents / 100n;
  const frac  = cents % 100n;
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

// ─── useUsdcAsset ───────────────────────────────────────────────────────────────

const ASSET_STALE_TIME = 24 * 60 * 60_000; // 24h — on-chain asset registration doesn't change at runtime.

/**
 * Resolves the USDC `Asset` (token address, decimals, allowed/isDollarUnit flags)
 * from the on-chain PaymentAdapter. Requires the smart-account-upgraded `Kokio`
 * instance (kokio.sdk.paymentAdapter), so it stays disabled/pending for a
 * fiat-only user or before the upgrade effect in kokioProvider.tsx lands.
 */
export function useUsdcAsset() {
  const { kokio } = useKokio();
  const paymentAdapter = kokio.sdk?.paymentAdapter;

  return useQuery<Asset>({
    queryKey:       [USDC_ASSET_KEY],
    queryFn:        async () => {
      if (!paymentAdapter) {
        throw new Error('Payment adapter not ready');
      }
      try {
        return await paymentAdapter.resolveAsset(stringToHex('USDC', { size: 32 }));
      } catch (error) {
        logger.error('USDC_ASSET_RESOLVE_FAILED', { error });
        throw error;
      }
    },
    enabled:        !!paymentAdapter,
    staleTime:      ASSET_STALE_TIME,
    gcTime:         ASSET_STALE_TIME,
    retry:          1,
  });
}

// ─── useWalletBalance ───────────────────────────────────────────────────────────

export interface UseWalletBalanceResult {
  balance:   string | undefined;
  isLoading: boolean;
  isError:   boolean;
}

/**
 * Returns the USDC balance of `address` (a device wallet or eSIM wallet address),
 * formatted to a 2-decimal display string via exact bigint arithmetic.
 *
 * `balance` is `undefined` while loading or on error — never a placeholder like
 * `'0'`, since a fake zero balance is indistinguishable from a real empty wallet.
 * Call sites are responsible for rendering their own loading/fallback UI.
 */
export function useWalletBalance(address?: string): UseWalletBalanceResult {
  const { kokio } = useKokio();
  const isActive  = useIsAppActive();
  const client    = kokio.sdk?.smartAccountClient;

  const assetQuery = useUsdcAsset();
  const asset = assetQuery.data;

  const balanceQuery = useQuery<bigint>({
    queryKey:        [WALLET_BALANCE_KEY, address, asset?.token],
    queryFn:         async () => {
      if (!client || !asset?.token || !address) {
        throw new Error('Wallet balance query ran without required inputs');
      }
      try {
        return await client.readContract({
          address:      asset.token,
          abi:          erc20Abi,
          functionName: 'balanceOf',
          args:         [address as Address],
        });
      } catch (error) {
        logger.error('WALLET_BALANCE_READ_FAILED', { error });
        throw error;
      }
    },
    enabled:         isActive && !!client && !!asset?.token && !!address,
    staleTime:       30_000,
    gcTime:          5 * 60_000,
    refetchOnMount:  true,
    retry:           1,
  });

  const balance = balanceQuery.data !== undefined && asset !== undefined
    ? formatUsdcAmount(balanceQuery.data, asset.decimals)
    : undefined;

  return {
    balance,
    // Honest single flag: the balance query is gated on the asset query, so
    // callers should see "loading" for the whole time either one is pending.
    isLoading: assetQuery.isLoading || balanceQuery.isLoading,
    isError:   assetQuery.isError || balanceQuery.isError,
  };
}
