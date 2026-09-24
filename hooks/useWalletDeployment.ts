import { useCallback } from "react";
import { type Hex } from "viem";
import { useKokio } from "@/hooks/useKokio";
import { requestWalletDeployment } from "@/utils/bff/wallet";
import { BffError } from "@/utils/bff/koKioBffClient";
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

// Deployment is processed by a backend cron (every 5 minutes, up to 6-7
// minutes worst case), so this only submits the request and returns
// immediately — it never blocks waiting for completion. kokioProvider's
// beginWalletDeploymentWatch takes over confirming it in the background,
// which keeps working even if the caller navigates away right after this
// resolves.
export type DeployDeviceWalletResult =
  | { status: 'already_deployed'; walletAddress: string }
  | { status: 'submitted'; walletAddress: string };

export function useWalletDeployment() {
  const { kokio, setupKokioUserWallet, beginWalletDeploymentWatch } = useKokio();

  const deployDeviceWallet = useCallback(async (): Promise<DeployDeviceWalletResult> => {
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

    try {
      await requestWalletDeployment();
    } catch (err) {
      if (!(err instanceof BffError) || err.code !== 'WALLET_ALREADY_DEPLOYED') throw err;

      const ownerKey: [Hex, Hex] = [userPasskey.x, userPasskey.y];
      const deviceWallet = await sdk.smartAccount.getSmartWallet(deviceUID, ownerKey, BigInt(rawSalt));
      await setupKokioUserWallet(deviceUID, deviceWallet);
      return { status: 'already_deployed', walletAddress: deviceWalletAddress };
    }

    beginWalletDeploymentWatch();
    return { status: 'submitted', walletAddress: deviceWalletAddress };
  }, [kokio, setupKokioUserWallet, beginWalletDeploymentWatch]);

  return { deployDeviceWallet };
}
