import { useCallback } from "react";
import { type Hex } from "viem";
import { useKokio } from "@/hooks/useKokio";
import { reportDeviceWalletDeployed } from "@/utils/bff/walletRegistration";
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

    // kokio-sdk's canonical user flow throws here on a mismatch ("device
    // wallet address mismatch") before sending anything. This app logs only,
    // by deliberate prior decision (see [[project_wallet_recovery_gap]]) —
    // flagged again 2026-09-19, not changed without explicit sign-off, since
    // enforcing it now could newly hard-fail signup for any real account
    // already carrying an undetected mismatch.
    const sdkAddress = deviceWalletClient.account?.address;
    logger.debug('GET_SMART_WALLET_RESULT', {
      sdkAddress,
      serverAddress: deviceWalletAddress,
      match: sdkAddress?.toLowerCase() === deviceWalletAddress.toLowerCase(),
    });

    // A no-op userOp that includes the initCode on first send, deploying the contract.
    // This triggers Passkey.get() inside the SDK's _stamp() — the biometric prompt.
    const userOpHash = await deviceWalletClient.sendUserOperation({
      calls: [{ to: deviceWalletClient.account.address, data: '0x', value: 0n }],
    });

    await setupKokioUserWallet(deviceUID, deviceWallet);

    // Tell the backend this device wallet deployed (kokio-sdk's canonical user
    // flow, step 2 -> 3) so it can register it in the on-chain Registry. No
    // endpoint exists for this yet — see reportDeviceWalletDeployed's doc.
    // Fire-and-forget: deployment itself already succeeded, so this must
    // never fail/block it, now or once it becomes a real network call.
    reportDeviceWalletDeployed(userOpHash).catch((err) => {
      logger.error('DEVICE_WALLET_DEPLOYED_REPORT_FAILED', { err });
    });

    return { walletAddress: deviceWalletAddress };
  }, [kokio, setupKokioUserWallet]);

  return { deployDeviceWallet };
}
