/**
 * Checks whether a device smart contract wallet is deployed and registered.
 * Used by kokioProvider to distinguish a genuinely recovered account
 * from a new registration that hasn't been deployed yet, 
 * so auto-derivation of the SmartContractAccount is only triggered for the former.
 *
 * NOTE: 
 * The Registry ABI fragment is inlined rather than imported from the SDK package
 * because kokio-sdk's package.json#exports does not expose an ./abis path. 
 * The ABI fragment below is sourced from src/abis/Registry.ts in the SDK repo.
 */

import {
  createPublicClient,
  http,
  type WalletClient,
  type Address,
} from 'viem';
import { Registry } from 'kokio-sdk/abis';
import { logger } from '@/utils/logger';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true when `deviceWalletAddress` is registered in the on-chain Registry contract.
 *
 * Returns false when:
 * - The wallet has not been deployed yet (new registration path).
 * - The registry address is not yet deployed for this chain ('0x').
 * - The RPC call fails for any reason.
 *
 * @param deviceWalletAddress  The 0x-prefixed contract address to check.
 * @param viemWalletClient     The already-constructed WalletClient from
 *                             kokio.sdk.viemWalletClient.
 *                             Carries the correct chain and transport.
 * @param registryAddress      The Registry contract address for the active chain,
 *                             read from kokio.sdk.constants.factoryAddresses.REGISTRY.
 */
export async function checkWalletDeployed(
  deviceWalletAddress: string,
  viemWalletClient: WalletClient,
  registryAddress: Address,
): Promise<boolean> {
  try {
    const chain = viemWalletClient.chain;
    const transportUrl = (viemWalletClient.transport as { url?: string }).url;
    
    const publicClient = createPublicClient({
      chain,
      transport: http(transportUrl),
    });

    const isValid = await publicClient.readContract({
      address: registryAddress,
      abi: Registry,
      functionName: 'isDeviceWalletValid',
      args: [deviceWalletAddress as Address],
    }) as boolean;

    logger.debug('WALLET_DEPLOY_CHECK', { deployed: isValid });
    return isValid;
  } catch (err) {
    // Fail-safe: RPC error.
    // The user can still deploy manually via WalletSetupModal.
    logger.error('WALLET_DEPLOY_CHECK_FAILED', { err });
    return false;
  }
}
