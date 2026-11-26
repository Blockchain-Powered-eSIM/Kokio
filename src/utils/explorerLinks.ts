import { base } from 'viem/chains';
import { Config } from '@/lib/config';
import {
  BASE_SEPOLIA_TESTNET,
  BASE_SEPOLIA_TESTNET_TX,
  BASE_MAINNET_EXPLORER,
  BASE_MAINNET_EXPLORER_TX,
} from '@/lib/constants/wallet';

// Same chain pick as providers/kokioProvider.tsx's RPC client.
export function getExplorerAddressBase(): string {
  return Config.CHAIN_ID === base.id ? BASE_MAINNET_EXPLORER : BASE_SEPOLIA_TESTNET;
}

export function getExplorerTxBase(): string {
  return Config.CHAIN_ID === base.id ? BASE_MAINNET_EXPLORER_TX : BASE_SEPOLIA_TESTNET_TX;
}
