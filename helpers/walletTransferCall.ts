import { encodeFunctionData, erc20Abi, type Address } from 'viem';

export interface TransferCall {
  to: Address;
  data?: `0x${string}`;
  value?: bigint;
}

/**
 * The exact call shape a transfer of `amount` (smallest unit) of `token` to
 * `recipient` sends through `sendUserOperation`. Shared by the live gas-fee
 * preview and the real send so the preview is never estimating a different
 * call than the one that actually gets signed.
 *
 * A token with no `address` is the native coin (ETH) - sent as plain value,
 * not through an ERC-20 `transfer`.
 */
export function buildTransferCall(
  token: { address?: Address },
  recipient: Address,
  amount: bigint,
): TransferCall {
  return token.address
    ? {
        to: token.address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [recipient, amount] }),
      }
    : { to: recipient, value: amount };
}
