import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
import { UserPasskey } from "@/providers/kokioProvider";
import Constants from "expo-constants";
import { AppExtraConfig } from "@/appKeys";
import { SmartContractAccount } from "@aa-sdk/core";
import { Kokio } from "kokio-sdk";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const initializeKokioSDK = async (userPasskey: UserPasskey, walletAddress: string) => {
  const extra = Constants.expoConfig?.extra as AppExtraConfig;

  const rpcUrl = extra.alchemyApiKey
    ? `https://base-sepolia.g.alchemy.com/v2/${extra.alchemyApiKey}`
    : 'https://sepolia.base.org';

  const viemClient = createWalletClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  if (!userPasskey.credentialId) {
    console.error("Error: credentialId missing");
    return;
  }

  const kokioSDK = new Kokio(
    viemClient,
    userPasskey.credentialId,
    PASSKEY_CONFIG.RP_ID,
    '',
    extra.pimlicoApiKey ?? '',
    extra.gasManagerPolicyId ?? '',
  );

  return kokioSDK;
};
