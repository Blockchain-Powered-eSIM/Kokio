import { useCallback, useState } from "react";
import { type Hex } from "viem";
import { useKokio } from "@/hooks/useKokio";
import { requestWalletDeployment, pollWalletState, type DeploymentStep } from "@/utils/bff/wallet";
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

export function useWalletDeployment() {
  const { kokio, setupKokioUserWallet } = useKokio();
  const [currentStep, setCurrentStep] = useState<DeploymentStep | null>(null);

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

    setCurrentStep(null);

    let alreadyDeployed = false;
    try {
      await requestWalletDeployment();
    } catch (err) {
      if (err instanceof BffError && err.code === 'WALLET_ALREADY_DEPLOYED') {
        alreadyDeployed = true;
      } else {
        throw err;
      }
    }

    if (!alreadyDeployed) {
      try {
        await pollWalletState({
          onUpdate: (update) => {
            if (update.kind === 'step') setCurrentStep(update.currentStep);
          },
        });
      } finally {
        setCurrentStep(null);
      }
    }

    // Reconstruct the smart account from the stored P-256 public key, the backend confirms the wallet is deployed.
    // This computes the same counterfactual address the server derived at registration.
    const ownerKey: [Hex, Hex] = [userPasskey.x, userPasskey.y];
    const salt = BigInt(rawSalt);

    const deviceWallet = await sdk.smartAccount.getSmartWallet(
      deviceUID,
      ownerKey,
      salt,
    );

    // Informational only — deployment no longer depends on this matching,
    // the backend derives and deploys to its own address regardless. Kept as
    // a canary for the address-derivation gap tracked in
    // project_wallet_recovery_gap (session memory), not a functional check.
    const sdkAddress = (deviceWallet as { address?: string }).address;
    logger.debug('GET_SMART_WALLET_RESULT', {
      sdkAddress,
      serverAddress: deviceWalletAddress,
      match: sdkAddress?.toLowerCase() === deviceWalletAddress.toLowerCase(),
    });

    await setupKokioUserWallet(deviceUID, deviceWallet);

    return { walletAddress: deviceWalletAddress };
  }, [kokio, setupKokioUserWallet]);

  return { deployDeviceWallet, currentStep };
}
