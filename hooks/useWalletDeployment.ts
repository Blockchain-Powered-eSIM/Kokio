import { useCallback } from "react";
import { type Hex } from "viem";
import { useKokio } from "@/hooks/useKokio";
import { logger } from "@/utils/logger";

// Thrown when required signup data (deviceWalletAddress/userPasskey/rawSalt/sdk)
// is missing. This only happens when the user never completed passkey signup
// (e.g. cancelled out of first-launch auth), not when deployment itself fails —
// callers should route to a "please sign up" state, not a generic retry.
export class MissingSignupDataError extends Error {
  constructor() {
    super("Required signup data is missing.");
    this.name = "MissingSignupDataError";
  }
}

export function useWalletDeployment() {
  const { kokio, setupKokioUserWallet } = useKokio();

  const deployDeviceWallet = useCallback(async (): Promise<{ walletAddress: string }> => {
    const { deviceWalletAddress, deviceUID, userPasskey, rawSalt, sdk } = kokio;

    logger.debug('WALLET_CONTINUE_STATE', {
      deviceWalletAddress: !!deviceWalletAddress,
      deviceUID: !!deviceUID,
      hasX: !!userPasskey?.x,
      hasY: !!userPasskey?.y,
      hasRawSalt: !!rawSalt,
      sdkReady: !!sdk,
    });

    if (!deviceWalletAddress || !userPasskey?.x || !userPasskey?.y || !rawSalt || !sdk) {
      logger.warn('WALLET_SETUP_GUARD_FAILED — Missing', {
        deviceWalletAddress,
        x: userPasskey?.x,
        y: userPasskey?.y,
        rawSalt: !!rawSalt,
        sdk: !!sdk,
      });
      throw new MissingSignupDataError();
    }

    // Reconstruct the smart account from the stored P-256 public key.
    // This computes the same counterfactual address the server derived at registration.
    const ownerKey: [Hex, Hex] = [userPasskey.x, userPasskey.y];
    const salt = BigInt(rawSalt);

    logger.debug('GET_SMART_WALLET_INPUTS', {
      deviceUID,
      ownerKeyX: userPasskey.x,
      ownerKeyY: userPasskey.y,
      rawSalt,
      saltBigInt: salt.toString(),
      saltHex: '0x' + salt.toString(16).padStart(64, '0'),
      serverAddress: deviceWalletAddress,
    });

    const deviceWallet = await sdk.smartAccount.getSmartWallet(
      deviceUID,
      ownerKey,
      salt,
    );

    const deviceWalletClient = await sdk.smartAccount.getSmartWalletClient(deviceWallet);

    const sdkAddress = deviceWalletClient.account?.address;
    logger.debug('GET_SMART_WALLET_RESULT', {
      sdkAddress,
      serverAddress: deviceWalletAddress,
      match: sdkAddress?.toLowerCase() === deviceWalletAddress.toLowerCase(),
    });

    // A no-op userOp that includes the initCode on first send, deploying the contract.
    // This triggers Passkey.get() inside the SDK's _stamp() — the biometric prompt.
    await deviceWalletClient.sendUserOperation({
      calls: [{ to: deviceWalletClient.account.address, data: '0x', value: 0n }],
    });

    await setupKokioUserWallet(deviceUID, deviceWallet);

    return { walletAddress: deviceWalletAddress };
  }, [kokio, setupKokioUserWallet]);

  return { deployDeviceWallet };
}
