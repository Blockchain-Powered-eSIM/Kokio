import Constants from 'expo-constants';
import { AppExtraConfig } from '@/appKeys';

export const PASSKEY_CONFIG = {
  RP_NAME: "Kokio App",
  RP_ID: "docs.kokio.app",
};

export const DEFAULT_ETHEREUM_ACCOUNTS = [
  {
    curve: "CURVE_SECP256K1" as const,
    pathFormat: "PATH_FORMAT_BIP32" as const,
    path: "m/44'/60'/0'/0/0",
    addressFormat: "ADDRESS_FORMAT_ETHEREUM" as const,
  },
];

const extra = Constants.expoConfig?.extra as AppExtraConfig;