/**
 * The two app -> backend handshakes from kokio-sdk's canonical user flow
 * (https://github.com/Blockchain-Powered-eSIM/kokio-sdk/blob/main/tests/consumer/flows/userFlow.ts)
 * that this app's own API surface does not implement yet, confirmed
 * (2026-09-19) against both `docs/kokio-bff-openapi-source.json` and the Auth
 * Server's spec — neither defines an endpoint for either handshake.
 *
 * Both functions below are the single integration point each handshake will
 * need once the backend ships the real endpoint: call sites already call
 * them at the right moment with the right data, so landing the backend piece
 * should only mean replacing the body of these two functions with a real
 * `unwrapBffResponse(api.post(...))` call (see utils/bff/coupon.ts for the
 * house style) — no call-site changes.
 *
 * Until then both are no-ops that only log, and never throw: neither may
 * ever block or fail the real on-chain deployment flow that surrounds them.
 *
 * See KokioSDKv3.md section 1.1/2.1 (2026-09-19 updates) and the
 * [[project_wallet_recovery_gap]] memory for the full story — the missing
 * backend registration step is the confirmed root cause of both the device
 * wallet never becoming `registry.isDeviceWalletValid` and the
 * `OnlyRegistryOrDeviceWalletFactoryOrDeviceWallet` revert investigated the
 * same week.
 */

import type { Hex } from 'viem';
import { logger } from '@/utils/logger';

/**
 * Spec step 2 -> 3: tell the backend a device wallet just deployed, so it can
 * run `DeviceWalletFactory.postCreateAccount` and make
 * `registry.isDeviceWalletValid` true for it. Called once, right after the
 * deployment user operation is sent (hooks/useWalletDeployment.ts).
 */
export async function reportDeviceWalletDeployed(userOpHash: Hex): Promise<void> {
  // TODO(backend): replace with a real call once an endpoint exists.
  logger.debug('DEVICE_WALLET_DEPLOYED_REPORT_PENDING_BACKEND', { userOpHash });
}

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
