import { ExpoConfig, ConfigContext } from "expo/config";
import { AppExtraConfig } from "./appKeys.js";
import { version } from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const privateConfig: AppExtraConfig = {
    authServerBaseUrl: process.env.AUTH_SERVER_BASE_URL,
    redirectUri: process.env.REDIRECT_URI,
    apiBaseUrl: process.env.API_BASE_URL,
    alchemyApiKey: process.env.ALCHEMY_API_KEY,
    pimlicoApiKey: process.env.PIMLICO_API_KEY,
    gasManagerPolicyId: process.env.GAS_MANAGER_POLICY_ID,
    chainId: process.env.CHAIN_ID,
    chainRpcUrl: process.env.CHAIN_RPC_URL,
    usdcAddress: process.env.USDC_ADDRESS,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    stripeMerchantIdentifier: process.env.STRIPE_MERCHANT_IDENTIFIER,
    walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID,
    externalWalletCallback: process.env.EXTERNAL_WALLET_CALLBACK,
  };

  return {
    // Merge any default or existing config
    ...config,

    newArchEnabled: true,
    name: "Kokio",
    slug: "kokio",
    owner: "kokio-sg",
    version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "kokio",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#242427",
    },
    runtimeVersion: version,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "app.kokio.mobile",
      associatedDomains: ["webcredentials:kokio.app", "applinks:kokio.app"],
      config: {
        usesNonExemptEncryption: false,
      },
      version,
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
      package: "app.kokio.mobile",
      edgeToEdgeEnabled: true,
      version,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "kokio.app", pathPrefix: "/callback" },
            { scheme: "https", host: "kokio.app", pathPrefix: "/moonpay-return" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          // kokio://wc-connect?uri=wc%3A... — WalletConnect pairing URI (PAY-011)
          action: "VIEW",
          data: [{ scheme: "kokio", host: "wc-connect" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "server",
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
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: process.env.STRIPE_MERCHANT_IDENTIFIER ?? "merchant.app.kokio",
          enableGooglePay: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/8dc9c10c-4c1d-4711-9ffd-39264bc209e1",
    },
    extra: {
      eas: {
        projectId: "8dc9c10c-4c1d-4711-9ffd-39264bc209e1",
      },
      ...privateConfig,
    },
  };
};
