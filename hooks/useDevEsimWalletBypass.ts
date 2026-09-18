/**
 * Dev-only checkout bypass: deploys a REAL on-chain eSIM wallet and registers
 * it to the device wallet, without going through Stripe/MoonPay/BFF order
 * creation at all. Lets the real top-up toggle (hooks/useEsimTopupAccess.ts)
 * be exercised without needing a live payment or a real eSIM purchase.
 *
 * Wires two SDK calls that exist but had no caller anywhere in the app before
 * this (see KokioSDKv3.md section 4.2/7): `eSIMWalletFactory.deployESIMWalletWithUserOp`
 * and `deviceWallet.addESIMWallet`. Both send real, signed user operations
 * (the passkey/biometric prompt fires) and are only trusted once their
 * receipts confirm `success`.
 *
 * __DEV__-gated at the call site (screens/checkout/Checkout.tsx) — this hook
 * itself does not check __DEV__, since it does nothing destructive: it only
 * ever adds a wallet, never touches real orders/payments.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseEventLogs, type Address } from 'viem';
import { ESIMWalletFactory } from 'kokio-sdk/abis';
import { useKokio } from '@/hooks/useKokio';
import { addDevLocalEsim, DEV_LOCAL_ESIMS_KEY } from '@/hooks/useDevLocalEsims';
import { DEVICE_ESIMS_KEY } from '@/hooks/useDeviceEsims';
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

    if (!sdk?.eSIMWalletFactory || !sdk?.deviceWallet || !sdk?.smartAccountClient || !deviceWalletAddress) {
      throw new DevWalletNotReadyError();
    }
    const { eSIMWalletFactory, deviceWallet, smartAccountClient } = sdk;

    // Any distinct value works as the CREATE2 salt; timestamp + random keeps
    // repeated dev runs from colliding on the same counterfactual address.
    const salt = (BigInt(Date.now()) << 32n) | BigInt(Math.floor(Math.random() * 2 ** 32));

    const deployHash = await eSIMWalletFactory.deployESIMWalletWithUserOp(deviceWalletAddress, salt);
    const deployReceipt = await smartAccountClient.waitForUserOperationReceipt({ hash: deployHash });
    if (!deployReceipt.success) {
      throw new Error('eSIM wallet deployment reverted on-chain');
    }

    const [deployedEvent] = parseEventLogs({
      abi: ESIMWalletFactory,
      eventName: 'ESIMWalletDeployed',
      logs: deployReceipt.logs,
    });
    const esimWalletAddress = deployedEvent?.args?._eSIMWalletAddress as Address | undefined;
    if (!esimWalletAddress) {
      throw new Error("Could not read the deployed eSIM wallet's address from the transaction receipt");
    }

    const registerHash = await deviceWallet.addESIMWallet(esimWalletAddress);
    const registerReceipt = await smartAccountClient.waitForUserOperationReceipt({ hash: registerHash });
    if (!registerReceipt.success) {
      throw new Error('Registering the eSIM wallet to the device wallet reverted on-chain');
    }

    await addDevLocalEsim({
      esimId: esimWalletAddress,
      deviceId: deviceWalletAddress,
      createdAt: new Date().toISOString(),
      plan: planSnapshot,
    });
    queryClient.invalidateQueries({ queryKey: [DEV_LOCAL_ESIMS_KEY] });
    // So a real eSIM bought right after this doesn't look stale/merged oddly.
    queryClient.invalidateQueries({ queryKey: [DEVICE_ESIMS_KEY] });

    return { esimId: esimWalletAddress };
  }, [kokio, queryClient]);

  return { deployTestEsimWallet };
}
