/**
 * Live, faithful preview of what a call would actually cost - runs it through
 * `prepareUserOperation` on the same bundler + ERC-7677 paymaster client that
 * `sendUserOperation` uses (see kokio-sdk's `_getSmartWalletClient`), rather
 * than a guessed flat number. `getStubSignature` and `getNonce` on this SDK's
 * account are both side-effect-free (no passkey prompt), so this is safe to
 * run on every amount/token change.
 *
 * If Pimlico's paymaster sponsors the operation, the prepared request comes
 * back with `paymaster` set and the account pays nothing - that is what
 * "sponsored" means under ERC-4337, not an assumption this hook makes on its
 * own. Otherwise the fee is paid from the account's own ETH, computed from
 * the real gas limits and fee-per-gas this preview resolves.
 */

import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useKokio } from '@/hooks/useKokio';
import type { TransferCall } from '@/helpers/walletTransferCall';
import { logger } from '@/utils/logger';

export const GAS_ESTIMATE_KEY = 'gas-estimate' as const;

export interface GasEstimate {
  isSponsored: boolean;
  /** Total fee in wei, paid from the account's own ETH. Undefined when sponsored - there is nothing to pay. */
  feeWei: bigint | undefined;
}

export function useGasEstimate(call: TransferCall | undefined) {
  const { kokio } = useKokio();
  const client = kokio.sdk?.smartAccountClient;

  return useQuery<GasEstimate>({
    queryKey: [GAS_ESTIMATE_KEY, call?.to, call?.data, call?.value?.toString()],
    queryFn: async (): Promise<GasEstimate> => {
      if (!client || !call) {
        throw new Error('Gas estimate query ran without required inputs');
      }
      try {
        const prepared = await client.prepareUserOperation({ calls: [call] });
        // `prepareUserOperation`'s return type is a union across every
        // EntryPoint version viem supports, but this SDK's account is always
        // pinned to v0.8 (see kokio-sdk's `_getSmartWallet`) - the fields
        // below exist on every v0.8 request, just not on TS's wider union.
        const request = prepared as unknown as {
          paymaster?: Address;
          preVerificationGas?: bigint;
          verificationGasLimit?: bigint;
          callGasLimit?: bigint;
          paymasterVerificationGasLimit?: bigint;
          paymasterPostOpGasLimit?: bigint;
          maxFeePerGas?: bigint;
        };
        if (request.paymaster) {
          return { isSponsored: true, feeWei: undefined };
        }
        const gasUnits =
          (request.preVerificationGas ?? 0n) +
          (request.verificationGasLimit ?? 0n) +
          (request.callGasLimit ?? 0n) +
          (request.paymasterVerificationGasLimit ?? 0n) +
          (request.paymasterPostOpGasLimit ?? 0n);
        return { isSponsored: false, feeWei: gasUnits * (request.maxFeePerGas ?? 0n) };
      } catch (error) {
        logger.error('GAS_ESTIMATE_FAILED', { error });
        throw error;
      }
    },
    enabled: !!client && !!call,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 1,
  });
}

const DISPLAY_DECIMALS = 6;
const WEI_PER_DISPLAY_UNIT = 10n ** BigInt(18 - DISPLAY_DECIMALS);
const DISPLAY_UNITS_PER_ETH = 10n ** BigInt(DISPLAY_DECIMALS);

// Ceiling, not truncation: a displayed fee must never understate what might
// actually be charged (the inverse of how a balance is displayed).
export function formatFeeEth(feeWei: bigint): string {
  const ceiledUnits = (feeWei + WEI_PER_DISPLAY_UNIT - 1n) / WEI_PER_DISPLAY_UNIT;
  const whole = ceiledUnits / DISPLAY_UNITS_PER_ETH;
  const frac = ceiledUnits % DISPLAY_UNITS_PER_ETH;
  return `${whole}.${frac.toString().padStart(DISPLAY_DECIMALS, '0')}`;
}
