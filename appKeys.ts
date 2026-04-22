import Constants from 'expo-constants';

// This ensures TypeScript knows which keys exist on Constants.expoConfig.extra
export interface AppExtraConfig {
    authServerBaseUrl?: string;
    redirectUri?: string;
    apiBaseUrl?: string;
}

const extra = Constants.expoConfig?.extra as AppExtraConfig | undefined;

export const Config = {
    // --- Private Secrets (from EAS) ---
    AUTH_SERVER_BASE_URL: extra?.authServerBaseUrl,
    REDIRECT_URI: extra?.redirectUri,
    API_BASE_URL: extra?.apiBaseUrl,

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
