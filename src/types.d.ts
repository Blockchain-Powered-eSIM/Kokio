// This file extends the process.env type to include the custom environment variables 
// (especially those injected as EAS Secrets).

declare namespace NodeJS {
  interface ProcessEnv {
    // PUBLIC EXPO VARS (Optional, but good for completeness)
    EXPO_PUBLIC_PASSKEY_RP_NAME?: string;
    EXPO_PUBLIC_RP_ID?: string;
    EXPO_PUBLIC_TURNKEY_API_URL?: string;

    // PRIVATE EAS SECRETS (MANDATORY TO DECLARE)
    ALCHEMY_API_KEY?: string;
    GAS_MANAGER_POLICY_ID?: string;
    PIMLICO_API_KEY?: string;
    TURNKEY_ORGANIZATION_ID?: string;
    TURNKEY_API_PUBLIC_KEY?: string;
    TURNKEY_API_PRIVATE_KEY?: string;
    API_BASE_URL?: string;
  }
}
