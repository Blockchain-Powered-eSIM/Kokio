import Constants from 'expo-constants';

// This ensures TypeScript knows which keys exist on Constants.expoConfig.extra
export interface AppExtraConfig {
    alchemyApiKey?: string;
    gasManagerPolicyId?: string;
    pimlicoApiKey?: string;
    turnkeyOrganizationId?: string;
    turnkeyApiPublicKey?: string;
    turnkeyApiPrivateKey?: string;
    apiBaseUrl?: string;
    serverBaseUrl?:string;
    reownProjectId?:string;
    kokioVaultAddress?:string;
}

const extra = Constants.expoConfig?.extra as AppExtraConfig | undefined;

export const Config = {
    // --- Private Secrets (from EAS) ---
    ALCHEMY_API_KEY: extra?.alchemyApiKey,
    GAS_MANAGER_POLICY_ID: extra?.gasManagerPolicyId,
    // PIMLICO
    PIMLICO_API_KEY: extra?.pimlicoApiKey,
    // TURNKEY
    TURNKEY_ORGANIZATION_ID: extra?.turnkeyOrganizationId,
    TURNKEY_API_PUBLIC_KEY: extra?.turnkeyApiPublicKey,
    TURNKEY_API_PRIVATE_KEY: extra?.turnkeyApiPrivateKey,
    // API Base URL
    API_BASE_URL: extra?.apiBaseUrl,
    SERVER_BASE_URL: extra?.serverBaseUrl,

    // --- Public Variables (from .env) ---
    EXPO_PUBLIC_PASSKEY_RP_NAME: process.env.EXPO_PUBLIC_PASSKEY_RP_NAME,
    EXPO_PUBLIC_RP_ID: process.env.EXPO_PUBLIC_RP_ID,
    EXPO_PUBLIC_TURNKEY_API_URL: process.env.EXPO_PUBLIC_TURNKEY_API_URL,

    // Wallet Connect
    REOWN_PROJECT_ID: process.env.REOWN_PROJECT_ID,
    // Kokio vault address
    KOKIO_VAULT: process.env.KOKIO_VAULT,

    // Utility function for validation
    validateSecrets: () => {
        if (!extra?.alchemyApiKey) {
            console.error("Critical Error: ALCHEMY_API_KEY is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.gasManagerPolicyId) {
            console.error("Critical Error: GAS_MANAGER_POLICY_ID is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.pimlicoApiKey) {
            console.error("Critical Error: PIMLICO_API_KEY is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.turnkeyOrganizationId) {
            console.error("Critical Error: TURNKEY_ORGANIZATION_ID is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.turnkeyApiPublicKey) {
            console.error("Critical Error: TURNKEY_API_PUBLIC_KEY is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.turnkeyApiPrivateKey) {
            console.error("Critical Error: TURNKEY_API_PRIVATE_KEY is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.apiBaseUrl) {
            console.error("Critical Error: API_BASE_URL is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.kokioVaultAddress) {
            console.error("Critical Error: KOKIO_VAULT is missing. Check your EAS Secrets configuration.");
        }
    }
};

Config.validateSecrets();
