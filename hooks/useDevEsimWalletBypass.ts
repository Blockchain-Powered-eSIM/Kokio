/**
 * Dev-only checkout bypass: deploys a REAL on-chain eSIM wallet and registers
 * it to the device wallet, without going through Stripe/MoonPay/BFF order
 * creation at all. Lets the real top-up toggle (hooks/useEsimTopupAccess.ts)
 * be exercised without needing a live payment or a real eSIM purchase.
 *
 * Wires `deviceWallet.deployAndBindESIMWallet` (kokio-sdk >=3.1.0), which had
 * no caller anywhere in the app before this (see KokioSDKv3.md section 4.2/7).
 * Deploy + bind is a single real, signed user operation (the passkey/biometric
 * prompt fires) and is only trusted once its receipt confirms `success`.
 *
 * Note: this still requires the device wallet to already be registry-valid
 * (`registry.isDeviceWalletValid`) - the SDK's own factory refuses it
 * otherwise. That precondition is unrelated to this bypass; see the
 * conversation history around 2026-09-18 for the ongoing investigation.
 *
 * __DEV__-gated at the call site (screens/checkout/Checkout.tsx) — this hook
 * itself does not check __DEV__, since it does nothing destructive: it only
 * ever adds a wallet, never touches real orders/payments.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';
import { ContractRevertError } from 'kokio-sdk';
import { useKokio } from '@/hooks/useKokio';
import { addDevLocalEsim, DEV_LOCAL_ESIMS_KEY } from '@/hooks/useDevLocalEsims';
import { DEVICE_ESIMS_KEY } from '@/hooks/useDeviceEsims';
import { submitESIMWalletProof } from '@/utils/bff/walletRegistration';
import { logger } from '@/utils/logger';
import type { Esim } from '@/components/ESIMItem';

export class DevWalletNotReadyError extends Error {
  constructor() {
    super('Deploy your device wallet first, then retry the test eSIM wallet.');
    this.name = 'DevWalletNotReadyError';
  }
}

export function useDevEsimWalletBypass() {
  const { kokio } = useKokio();
  const queryClient = useQueryClient();

  const deployTestEsimWallet = useCallback(async (planSnapshot: Esim): Promise<{ esimId: string }> => {
    const sdk = kokio.sdk;
    const deviceWalletAddress = kokio.deviceWalletAddress as Address | undefined;

    if (!sdk?.deviceWallet || !sdk?.smartAccountClient || !deviceWalletAddress) {
      throw new DevWalletNotReadyError();
    }
    const { deviceWallet, smartAccountClient } = sdk;

    // Any distinct value works as the CREATE2 salt; timestamp + random keeps
    // repeated dev runs from colliding on the same counterfactual address.
    const salt = (BigInt(Date.now()) << 32n) | BigInt(Math.floor(Math.random() * 2 ** 32));

    let userOpHash: Hex;
    let esimWalletAddress: Address;
    try {
      ({ userOpHash, eSIMWalletAddress: esimWalletAddress } = await deviceWallet.deployAndBindESIMWallet(salt));
    } catch (err) {
      // The SDK's bundler client (>=3.1.0) already decodes a revert into
      // ContractRevertError before this promise rejects - surface its name
      // instead of a generic message.
      if (err instanceof ContractRevertError) {
        throw new Error(
          err.decoded?.errorName
            ? `Deployment reverted on-chain: ${err.decoded.errorName}`
            : 'Deployment reverted on-chain',
        );
      }
      throw err;
    }

    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });
    if (!receipt.success) {
      throw new Error('eSIM wallet deployment reverted on-chain');
    }

    // Binds kokio.sdk.eSIMWallet to what was just deployed (kokio-sdk's
    // canonical flow does this immediately after deployAndBindESIMWallet) -
    // harmless if nothing reads it yet, needed for any future call through it.
    sdk.setESIMWalletAddress(esimWalletAddress);

    await addDevLocalEsim({
      esimId: esimWalletAddress,
      deviceId: deviceWalletAddress,
      createdAt: new Date().toISOString(),
      plan: planSnapshot,
    });
    queryClient.invalidateQueries({ queryKey: [DEV_LOCAL_ESIMS_KEY] });
    // So a real eSIM bought right after this doesn't look stale/merged oddly.
    queryClient.invalidateQueries({ queryKey: [DEVICE_ESIMS_KEY] });

    // Prove this eSIM wallet to the backend (spec step 4 -> 5). No endpoint
    // exists for this yet — see submitESIMWalletProof's doc. Fire-and-forget:
    // this dev tool's local record is already saved, so this must never
    // fail/block it, now or once it becomes a real network call.
    submitESIMWalletProof({ eSIMWalletAddress: esimWalletAddress, eSIMSalt: salt.toString(), userOpHash }).catch((err) => {
      logger.error('ESIM_WALLET_PROOF_FAILED', { err });
    });

    return { esimId: esimWalletAddress };
  }, [kokio, queryClient]);

  return { deployTestEsimWallet };
}
