import Constants from 'expo-constants';

// This ensures TypeScript knows which keys exist on Constants.expoConfig.extra
export interface AppExtraConfig {
    authServerBaseUrl?: string;
    redirectUri?: string;
    apiBaseUrl?: string;
    alchemyApiKey?: string;
    pimlicoApiKey?: string;
    gasManagerPolicyId?: string;
}

const extra = Constants.expoConfig?.extra as AppExtraConfig | undefined;

export const Config = {
    // --- Private Secrets (from EAS) ---
    AUTH_SERVER_BASE_URL: extra?.authServerBaseUrl,
    REDIRECT_URI: extra?.redirectUri,
    API_BASE_URL: extra?.apiBaseUrl,
    ALCHEMY_API_KEY: extra?.alchemyApiKey,
    PIMLICO_API_KEY: extra?.pimlicoApiKey,
    GAS_MANAGER_POLICY_ID: extra?.gasManagerPolicyId,

    // Utility function for validation
    validateSecrets: () => {
        if (!extra?.authServerBaseUrl) {
            console.error("Critical Error: AUTH_SERVER_BASE_URL is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.redirectUri) {
            console.error("Critical Error: REDIRECT_URI is missing. Check your EAS Secrets configuration.");
        }
        if (!extra?.apiBaseUrl) {
            console.error("Critical Error: API_BASE_URL is missing. Check your EAS Secrets configuration.");
        }
    }
};

Config.validateSecrets();
