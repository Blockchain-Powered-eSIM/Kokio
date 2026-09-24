/**
 * eSIM-wallet ownership is verified and recorded by the backend itself during order fulfilment, not by a client-submitted proof.
 * submitESIMWalletProof is a permanent no-op that only logs, and never throws: it must never block or fail the real on-chain deployment flow that surrounds it.
 */

import type { Hex } from 'viem';
import { logger } from '@/utils/logger';

export interface ESIMWalletProof {
  eSIMWalletAddress: string;
  eSIMSalt: string;
  userOpHash: Hex;
}

/** No-op by design: the backend verifies and records eSIM-wallet ownership itself. */
export async function submitESIMWalletProof(proof: ESIMWalletProof): Promise<void> {
  logger.debug('ESIM_WALLET_PROOF_NOT_NEEDED', proof);
}
