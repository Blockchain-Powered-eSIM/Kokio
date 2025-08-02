export const PASSKEY_CONFIG = {
    RP_NAME: process.env.EXPO_PUBLIC_PASSKEY_RP_NAME ?? "Kokio App",
    RP_ID: process.env.EXPO_PUBLIC_RP_ID ?? "docs.kokio.app",
  };
  
  export const DEFAULT_ETHEREUM_ACCOUNTS = [
    {
      curve: "CURVE_SECP256K1" as const,
      pathFormat: "PATH_FORMAT_BIP32" as const,
      path: "m/44'/60'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_ETHEREUM" as const,
    },
  ];
  
  export const TURNKEY_PARENT_ORG_ID =
    process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID ?? "";
  export const TURNKEY_API_URL = process.env.EXPO_PUBLIC_TURNKEY_API_URL ?? "";