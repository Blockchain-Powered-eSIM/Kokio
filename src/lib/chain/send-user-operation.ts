import type { Hex } from "viem";
import type { Kokio } from "kokio-sdk";

type DeviceWallet = NonNullable<Kokio["deviceWallet"]>;
type SmartAccountClient = NonNullable<Kokio["smartAccountClient"]>;
type Call = Parameters<DeviceWallet["sendUserOperation"]>[0][number];

/**
 * Sends the calls from the device wallet as one user operation, in order, and waits until it is mined.
 * Fires the passkey prompt. Throws if the calls reverted, so callers never report a failed transfer as sent.
 */
export async function sendAndConfirmUserOperation(
  deviceWallet: DeviceWallet,
  smartAccountClient: SmartAccountClient,
  calls: Call[],
): Promise<{ userOpHash: Hex; transactionHash: Hex }> {
  const userOpHash = await deviceWallet.sendUserOperation(calls);
  const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

  // A user operation whose calls revert is still mined and still returns a receipt.
  if (!receipt.success) {
    throw new Error("User operation reverted on-chain");
  }
  return { userOpHash, transactionHash: receipt.receipt.transactionHash };
}
