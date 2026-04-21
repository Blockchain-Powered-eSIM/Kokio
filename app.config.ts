import { ExpoConfig, ConfigContext } from "expo/config";
import { AppExtraConfig } from "./appKeys.js";

export default ({ config }: ConfigContext): ExpoConfig => {
  const privateConfig: AppExtraConfig = {
    authServerBaseUrl: process.env.AUTH_SERVER_BASE_URL,
    redirectUri: process.env.REDIRECT_URI,
    apiBaseUrl: process.env.API_BASE_URL,
    /* @deprecate */
    // // ALCHEMY
    // alchemyApiKey: process.env.ALCHEMY_API_KEY,
    // gasManagerPolicyId: process.env.GAS_MANAGER_POLICY_ID,

    // // PIMLICO
    // pimlicoApiKey: process.env.PIMLICO_API_KEY,

    // // TURNKEY
    // turnkeyOrganizationId: process.env.TURNKEY_ORGANIZATION_ID,
    // turnkeyApiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    // turnkeyApiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,

    // serverBaseUrl: process.env.SERVER_BASE_URL,

    // // Wallet Connect
    // reownProjectId: process.env.REOWN_PROJECT_ID,

    // // Kokio vault address
    // kokioVaultAddress: process.env.KOKIO_VAULT,
  };

  return {
    // Merge any default or existing config
    ...config,

    newArchEnabled: true,
    name: "Kokio",
    slug: "Kokio",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "kokio",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#242427",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "app.kokio",
      associatedDomains: ["webcredentials:docs.kokio.app"],
      config: {
        usesNonExemptEncryption: false,
      },
      runtimeVersion: "1.0.0",
      version: "1.0.0",
      buildNumber: "1",
      infoPlist: {
        NSPhotoLibraryUsageDescription: "This app may access your photo library when selecting or sharing images."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#242427",
      },
      package: "app.kokio",
      edgeToEdgeEnabled: false,
      version: "1.0.0",
      runtimeVersion: "1.0.0",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            kotlinVersion: "2.1.20",
          },
          ios: {
            deploymentTarget: "17.0",
          },
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#242427",
          image: "./assets/images/splash.png",
          dark: {
            image: "./assets/images/splash.png",
            backgroundColor: "#242427",
          },
          imageWidth: 200,
        },
      ],
      "expo-router",
      "expo-font",
      [
        "expo-secure-store",
        {
          configureAndroidBackup: true,
          faceIDPermission:
            "Allow $(PRODUCT_NAME) to access your Face ID biometric data.",
        },
      ],
      "expo-asset",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/113a4624-12f1-425b-b76c-a7bedc503b5e",
    },
    extra: {
      eas: {
        projectId: "113a4624-12f1-425b-b76c-a7bedc503b5e",
      },
      ...privateConfig,
    },
  };
};
