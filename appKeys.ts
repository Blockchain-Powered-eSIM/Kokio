import Constants from "expo-constants";

export interface AppExtraConfig {
  authServerBaseUrl?: string;
  redirectUri?: string;
  apiBaseUrl?: string;
  alchemyApiKey?: string;
  pimlicoApiKey?: string;
  gasManagerPolicyId?: string;
  chainId?: string;
  chainRpcUrl?: string;
  usdcAddress?: string;
  stripePublishableKey?: string;
  stripeMerchantIdentifier?: string;
  walletConnectProjectId?: string;
  externalWalletCallback?: string;
}

const extra =
  (Constants.expoConfig?.extra as AppExtraConfig | undefined) ??
  ((Constants as any).manifest?.extra as AppExtraConfig | undefined) ??
  ((Constants as any).manifest2?.extra?.expoClient?.extra as
    | AppExtraConfig
    | undefined);

console.log("[KOKIO CONFIG DEBUG]", {
  extraKeys: Object.keys(extra ?? {}),
  apiBaseUrl: extra?.apiBaseUrl,
  authServerBaseUrl: extra?.authServerBaseUrl,
  stripePublishableKeySet: Boolean(extra?.stripePublishableKey),
  walletConnectProjectIdSet: Boolean(extra?.walletConnectProjectId),
});

export const Config = {
  AUTH_SERVER_BASE_URL: extra?.authServerBaseUrl,
  REDIRECT_URI: extra?.redirectUri,
  API_BASE_URL: extra?.apiBaseUrl,
  ALCHEMY_API_KEY: extra?.alchemyApiKey,
  PIMLICO_API_KEY: extra?.pimlicoApiKey,
  GAS_MANAGER_POLICY_ID: extra?.gasManagerPolicyId,
  CHAIN_ID: extra?.chainId ? Number(extra.chainId) : undefined,
  CHAIN_RPC_URL: extra?.chainRpcUrl,
  USDC_ADDRESS: extra?.usdcAddress,
  STRIPE_PUBLISHABLE_KEY: extra?.stripePublishableKey,
  STRIPE_MERCHANT_IDENTIFIER: extra?.stripeMerchantIdentifier,
  WALLETCONNECT_PROJECT_ID: extra?.walletConnectProjectId,
  EXTERNAL_WALLET_CALLBACK: extra?.externalWalletCallback,

  validateSecrets: () => {
    if (!extra?.authServerBaseUrl) {
      console.error(
        "Critical Error: AUTH_SERVER_BASE_URL is missing. Check your EAS Secrets configuration."
      );
    }

    if (!extra?.redirectUri) {
      console.error(
        "Critical Error: REDIRECT_URI is missing. Check your EAS Secrets configuration."
      );
    }

    if (!extra?.apiBaseUrl) {
      console.error(
        "Critical Error: API_BASE_URL is missing. Check your EAS Secrets configuration."
      );
    }

    if (!extra?.stripePublishableKey) {
      console.warn(
        "Warning: STRIPE_PUBLISHABLE_KEY is not set. Stripe payments (PAY-008) will not work."
      );
    }

    if (!extra?.walletConnectProjectId) {
      console.warn(
        "Warning: WALLETCONNECT_PROJECT_ID is not set. WalletConnect sessions (PAY-011) will not work."
      );
    }
  },
};

Config.validateSecrets();
