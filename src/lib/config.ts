import Constants from "expo-constants";
import { logger } from "@/lib/logger";

export interface AppExtraConfig {
  authServerBaseUrl?: string;
  redirectUri?: string;
  apiBaseUrl?: string;
  alchemyApiKey?: string;
  pimlicoApiKey?: string;
  gasManagerPolicyId?: string;
  chainId?: string;
  chainRpcUrl?: string;
  stripePublishableKey?: string;
  stripeMerchantIdentifier?: string;
  externalWalletCallback?: string;
}

// expoConfig covers both embedded launches and OTA updates (it reads manifest2.extra.expoClient itself).
const extra = Constants.expoConfig?.extra as AppExtraConfig | undefined;

export const Config = {
  AUTH_SERVER_BASE_URL: extra?.authServerBaseUrl,
  REDIRECT_URI: extra?.redirectUri,
  API_BASE_URL: extra?.apiBaseUrl,
  ALCHEMY_API_KEY: extra?.alchemyApiKey,
  PIMLICO_API_KEY: extra?.pimlicoApiKey,
  GAS_MANAGER_POLICY_ID: extra?.gasManagerPolicyId,
  CHAIN_ID: extra?.chainId ? Number(extra.chainId) : undefined,
  CHAIN_RPC_URL: extra?.chainRpcUrl,
  STRIPE_PUBLISHABLE_KEY: extra?.stripePublishableKey,
  STRIPE_MERCHANT_IDENTIFIER: extra?.stripeMerchantIdentifier,
  EXTERNAL_WALLET_CALLBACK: extra?.externalWalletCallback,

  validateSecrets: () => {
    if (!extra?.authServerBaseUrl) logger.error('CONFIG_MISSING_AUTH_SERVER_BASE_URL');
    if (!extra?.redirectUri) logger.error('CONFIG_MISSING_REDIRECT_URI');
    if (!extra?.apiBaseUrl) logger.error('CONFIG_MISSING_API_BASE_URL');
    if (!extra?.stripePublishableKey) logger.error('CONFIG_MISSING_STRIPE_PUBLISHABLE_KEY');
    if (!extra?.stripeMerchantIdentifier) logger.warn('CONFIG_MISSING_STRIPE_MERCHANT_IDENTIFIER');
    if (!extra?.chainId) logger.error('CONFIG_MISSING_CHAIN_ID');
  },
};

Config.validateSecrets();
