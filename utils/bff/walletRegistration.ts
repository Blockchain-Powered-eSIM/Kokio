/**
 * No backend endpoint exists yet to prove a newly deployed eSIM wallet
 * belongs to its device wallet, so submitESIMWalletProof stays a no-op that
 * only logs, and never
 * throws: it may never block or fail the real on-chain deployment flow that
 * surrounds it.
 */

import type { Hex } from 'viem';
import { logger } from '@/utils/logger';

export interface ESIMWalletProof {
  eSIMWalletAddress: string;
  eSIMSalt: string;
  userOpHash: Hex;
}

/**
 * Spec step 4 -> 5: prove a newly deployed eSIM wallet to the backend so it
 * can verify ownership (via the on-chain Registry, per the spec's own check
 * list) and store `eSIMWalletAddress` against the user. Called once, right
 * after `deviceWallet.deployAndBindESIMWallet` succeeds.
 */
export async function submitESIMWalletProof(proof: ESIMWalletProof): Promise<void> {
  // TODO(backend): replace with a real call once an endpoint exists.
  logger.debug('ESIM_WALLET_PROOF_PENDING_BACKEND', proof);
}
