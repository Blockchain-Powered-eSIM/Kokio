/**
 * Balances of every token the wallet can hold or pay with, for a device wallet address.
 *
 * Built-in ERC-20s (USDC, USDT, DAI, and USDCt in __DEV__) are resolved through the
 * on-chain PaymentAdapter registry and read with `balanceOf`. Custom tokens (added via
 * Add Token, see hooks/useCustomTokens.ts) skip the registry entirely and are read
 * directly at their stored contract address, since the registry only resolves symbols
 * it was explicitly configured with. ETH is the smart account's native balance, since
 * gas for personal transfers is paid from it.
 *
 * There is no ETH price source in the app (no on-chain oracle, no third-party feed
 * wired up), so ETH is shown by amount only - `usd` is always undefined for it and it
 * is left out of `totalUsd`, which sums the stablecoins only. A token that fails to
 * resolve or read shows no amount and is left out of the total rather than shown as zero.
 *
 * Not persisted: balances are on-chain state and must never be restored from disk.
 */

import { useQuery } from '@tanstack/react-query';
import { erc20Abi, formatUnits, stringToHex, type Address } from 'viem';
import type { ImageSourcePropType } from 'react-native';
import { useKokio } from '@/hooks/useKokio';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import type { CustomToken } from '@/hooks/useCustomTokens';
import { logger } from '@/utils/logger';

export const WALLET_TOKENS_KEY = 'wallet-tokens' as const;

export type WalletTokenSymbol = 'USDC' | 'USDT' | 'DAI' | 'ETH' | 'USDCt';

export interface WalletToken {
  symbol: string;
  name: string;
  /** Absent for a custom-added token - there's no bundled icon asset for an arbitrary contract. */
  icon?: ImageSourcePropType;
  amount: string | undefined;
  usd: string | undefined;
  isStablecoin: boolean;
  decimals: number;
  /** The ERC-20 contract address this balance was read from. Undefined for ETH, which is native. */
  address?: Address;
}

interface TokenDefinition {
  symbol: string;
  name: string;
  icon?: ImageSourcePropType;
  isStablecoin: boolean;
  /** Direct contract address - set for a custom-added token, bypassing the registry. */
  address?: Address;
  /** Only needed alongside `address`: a custom token has no registry `Asset` to read decimals from. */
  decimals?: number;
}

const TOKEN_DEFINITIONS: TokenDefinition[] = [
  { symbol: 'USDC', name: 'USD Coin', icon: require('@/assets/images/wallet/usdc.png'), isStablecoin: true },
  { symbol: 'USDT', name: 'Tether', icon: require('@/assets/images/wallet/usdt.png'), isStablecoin: true },
  { symbol: 'DAI', name: 'Dai', icon: require('@/assets/images/wallet/dai.png'), isStablecoin: true },
  { symbol: 'ETH', name: 'Ether', icon: require('@/assets/images/wallet/eth.png'), isStablecoin: false },
];

const DEV_TOKEN_DEFINITIONS: TokenDefinition[] = [
  { symbol: 'USDCt', name: 'USD Coin (test)', icon: require('@/assets/images/wallet/usdc.png'), isStablecoin: true },
];

const BUILT_IN_TOKEN_DEFINITIONS = __DEV__ ? [...TOKEN_DEFINITIONS, ...DEV_TOKEN_DEFINITIONS] : TOKEN_DEFINITIONS;

type RawBalance = { raw: bigint; decimals: number; address?: Address } | undefined;

// Truncates rather than rounds: a displayed balance must never overstate what the wallet holds.
function truncateDecimals(value: string, places: number): string {
  const [whole, frac = ''] = value.split('.');
  if (places === 0) return whole;
  return `${whole}.${frac.slice(0, places).padEnd(places, '0')}`;
}

function sumStablecoinsCents(balances: RawBalance[]): string | undefined {
  const present = balances.filter((b): b is NonNullable<RawBalance> => b !== undefined);
  if (present.length === 0) return undefined;
  const cents = present.reduce(
    (acc, { raw, decimals }) => acc + (raw * 100n) / 10n ** BigInt(decimals),
    0n,
  );
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

export function useWalletTokens(address?: string, customTokens: CustomToken[] = []) {
  const { kokio } = useKokio();
  const isActive = useIsAppActive();
  const client = kokio.sdk?.smartAccountClient;
  const paymentAdapter = kokio.sdk?.paymentAdapter;

  const customDefinitions: TokenDefinition[] = customTokens.map((t) => ({
    symbol: t.symbol,
    name: t.symbol,
    isStablecoin: false,
    address: t.address,
    decimals: t.decimals,
  }));
  const allDefinitions = [...BUILT_IN_TOKEN_DEFINITIONS, ...customDefinitions];

  const query = useQuery<RawBalance[]>({
    // Custom-token addresses are part of the key: a newly added token must
    // read its own balance rather than reuse a cache entry keyed only by
    // wallet address.
    queryKey: [WALLET_TOKENS_KEY, address, customTokens.map((t) => t.address).join(',')],
    queryFn: () =>
      Promise.all(
        allDefinitions.map(async (definition): Promise<RawBalance> => {
          const { symbol } = definition;
          try {
            if (!client || !address) {
              throw new Error('Token balance query ran without required inputs');
            }
            if (symbol === 'ETH') {
              const raw = await client.getBalance({ address: address as Address });
              return { raw, decimals: 18 };
            }
            if (definition.address) {
              const raw = await client.readContract({
                address: definition.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [address as Address],
              });
              return { raw, decimals: definition.decimals!, address: definition.address };
            }
            if (!paymentAdapter) {
              throw new Error('Token balance query ran without required inputs');
            }
            const asset = await paymentAdapter.resolveAsset(stringToHex(symbol, { size: 32 }));
            const raw = await client.readContract({
              address: asset.token,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address as Address],
            });
            return { raw, decimals: asset.decimals, address: asset.token };
          } catch (error) {
            if (error instanceof Error && error.message.includes('AssetNotAllowed')) {
              logger.debug('WALLET_TOKEN_NOT_ALLOWED', { symbol });
            } else {
              logger.error('WALLET_TOKEN_READ_FAILED', { symbol, error });
            }
            return undefined;
          }
        }),
      ),
    enabled: isActive && !!client && !!address && (customDefinitions.length > 0 || !!paymentAdapter),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
    retry: 1,
  });

  const balances = query.data;

  const tokens: WalletToken[] = allDefinitions.map((definition, index) => {
    const balance = balances?.[index];
    if (!balance) {
      return {
        symbol: definition.symbol,
        name: definition.name,
        icon: definition.icon,
        amount: undefined,
        usd: undefined,
        isStablecoin: definition.isStablecoin,
        decimals: definition.decimals ?? (definition.symbol === 'ETH' ? 18 : 6),
        address: definition.address,
      };
    }
    const decimalPlaces = definition.isStablecoin ? 2 : 6;
    const amount = truncateDecimals(formatUnits(balance.raw, balance.decimals), decimalPlaces);
    return {
      symbol: definition.symbol,
      name: definition.name,
      icon: definition.icon,
      amount,
      usd: definition.isStablecoin ? amount : undefined,
      isStablecoin: definition.isStablecoin,
      decimals: balance.decimals,
      address: balance.address,
    };
  });

  const stablecoinBalances = balances?.filter((_, index) => allDefinitions[index].isStablecoin);

  return {
    tokens,
    totalUsd: stablecoinBalances ? sumStablecoinsCents(stablecoinBalances) : undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
