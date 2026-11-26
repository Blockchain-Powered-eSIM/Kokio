// Builds the Kokio SDK and its RPC transport. This is the only code that reads
// the RPC, bundler and paymaster keys, so moving them behind the backend changes this file alone.

import { Kokio } from "kokio-sdk";
import type { KokioSmartAccount, KokioSmartAccountClient } from "kokio-sdk/types";
import { createWalletClient, http, type Address, type Chain, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";
import { Config } from "@/lib/config";
import { PASSKEY_CONFIG } from "@/lib/constants/auth";

/** The chain the app is configured for, or `null` when the configured chain ID is missing or unsupported. */
export function resolveChain(): Chain | null {
  const chainId = Config.CHAIN_ID;
  // Release builds must not silently fall back to testnet on bad config.
  if (chainId !== base.id && chainId !== baseSepolia.id) return null;
  return chainId === base.id ? base : baseSepolia;
}

function rpcUrlFor(chain: Chain): string {
  const alchemySubdomain = chain.id === base.id ? "base-mainnet" : "base-sepolia";
  return Config.ALCHEMY_API_KEY
    ? `https://${alchemySubdomain}.g.alchemy.com/v2/${Config.ALCHEMY_API_KEY}`
    : (Config.CHAIN_RPC_URL ?? chain.rpcUrls.default.http[0]);
}

/** A Kokio SDK instance for the passkey's signer, without a smart account bound yet. */
export function createKokioClient(chain: Chain, credentialId: string, signerAddress: Address): Kokio {
  const viemClient = createWalletClient({
    chain,
    transport: http(rpcUrlFor(chain)),
    account: signerAddress,
  });

  return new Kokio(
    viemClient,
    credentialId,
    PASSKEY_CONFIG.RP_ID,
    Config.PIMLICO_API_KEY ?? "",
    Config.GAS_MANAGER_POLICY_ID ?? "",
  );
}

/**
 * The same SDK instance rebuilt with a smart account client and device wallet bound,
 * which the registry and wallet sub-packages need.
 */
export function withSmartAccount(
  sdk: Kokio,
  smartAccountClient: KokioSmartAccountClient,
  deviceWalletAddress: Address,
): Kokio {
  return new Kokio(
    sdk.viemWalletClient,
    sdk.credentialId,
    sdk.rpId,
    sdk.pimlicoAPIKey,
    sdk.gasPolicyId,
    smartAccountClient,
    deviceWalletAddress,
  );
}

/**
 * Derives the user's smart wallet from their passkey and salt, and returns it with the SDK
 * rebuilt around it. This only derives the account, so no passkey prompt fires.
 */
export async function deriveKokioWallet(
  sdk: Kokio,
  deviceUID: string,
  passkey: { x: Hex; y: Hex },
  rawSalt: string,
  deviceWalletAddress: Address,
): Promise<{ account: KokioSmartAccount; kokio: Kokio }> {
  const account = await sdk.smartAccount.getSmartWallet(deviceUID, [passkey.x, passkey.y], BigInt(rawSalt));
  const smartAccountClient = await sdk.smartAccount.getSmartWalletClient(account);
  return { account, kokio: withSmartAccount(sdk, smartAccountClient, deviceWalletAddress) };
}
