import Constants from "expo-constants";
import { logger } from "@/utils/logger";

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

 logger.debug("[KOKIO CONFIG DEBUG]", {
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
    if (!extra?.authServerBaseUrl) logger.error('CONFIG_MISSING_AUTH_SERVER_BASE_URL');
    if (!extra?.redirectUri) logger.error('CONFIG_MISSING_REDIRECT_URI');
    if (!extra?.apiBaseUrl) logger.error('CONFIG_MISSING_API_BASE_URL');
    if (!extra?.stripePublishableKey) logger.error('CONFIG_MISSING_STRIPE_PUBLISHABLE_KEY');
    if (!extra?.stripeMerchantIdentifier) logger.warn('CONFIG_MISSING_STRIPE_MERCHANT_IDENTIFIER');
    if (!extra?.walletConnectProjectId) logger.warn('CONFIG_MISSING_WALLETCONNECT_PROJECT_ID');
  },
};

Config.validateSecrets();
