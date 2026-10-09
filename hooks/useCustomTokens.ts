/**
 * User-added ERC-20 tokens, stored locally (AsyncStorage, device-only, no backend).
 *
 * A custom token is read directly from its contract address via the smart
 * account client's `readContract` - it never goes through the on-chain
 * PaymentAdapter registry, because that registry only resolves symbols it
 * was explicitly configured with (USDC, USDT, DAI, ...); it has no way to
 * look up an arbitrary pasted address. This is the same reason ETH's balance
 * is read directly rather than through the registry.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { erc20Abi, isAddress, type Address } from 'viem';
import { useKokio } from '@/hooks/useKokio';
import { logger } from '@/utils/logger';

const CUSTOM_TOKENS_KEY = 'customTokens';

export interface CustomToken {
  address: Address;
  symbol: string;
  decimals: number;
  addedAt: string;
}

export class CustomTokenError extends Error {}

async function readStoredTokens(): Promise<CustomToken[]> {
  const json = await AsyncStorage.getItem(CUSTOM_TOKENS_KEY);
  return json ? JSON.parse(json) : [];
}

export function useCustomTokens() {
  const { kokio } = useKokio();
  const [tokens, setTokens] = useState<CustomToken[]>([]);

  const refetch = useCallback(async () => {
    try {
      setTokens(await readStoredTokens());
    } catch (error) {
      logger.error('CUSTOM_TOKENS_FETCH_FAILED', { error });
      setTokens([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const addToken = useCallback(async (rawAddress: string): Promise<CustomToken> => {
    const address = rawAddress.trim();
    if (!isAddress(address)) {
      throw new CustomTokenError('Enter a valid contract address');
    }

    const existing = await readStoredTokens();
    if (existing.some((t) => t.address.toLowerCase() === address.toLowerCase())) {
      throw new CustomTokenError("You've already added this token");
    }

    const client = kokio.sdk?.smartAccountClient;
    if (!client) {
      throw new CustomTokenError("Wallet isn't ready yet - try again in a moment");
    }

    let symbol: string;
    let decimals: number;
    try {
      const [rawSymbol, rawDecimals] = await Promise.all([
        client.readContract({ address: address as Address, abi: erc20Abi, functionName: 'symbol' }),
        client.readContract({ address: address as Address, abi: erc20Abi, functionName: 'decimals' }),
      ]);
      symbol = rawSymbol;
      decimals = Number(rawDecimals);
    } catch (error) {
      logger.error('CUSTOM_TOKEN_METADATA_READ_FAILED', { address, error });
      throw new CustomTokenError("This doesn't look like a token contract on this network");
    }

    const token: CustomToken = { address: address as Address, symbol, decimals, addedAt: new Date().toISOString() };
    const updated = [...existing, token];
    await AsyncStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updated));
    setTokens(updated);
    return token;
  }, [kokio.sdk]);

  return { tokens, refetch, addToken };
}
