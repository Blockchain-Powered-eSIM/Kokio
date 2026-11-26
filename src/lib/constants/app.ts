import { Platform } from "react-native";

export const RADIO_KEYS = {
  E_SIM_WALLET: "E_SIM_WALLET",
  CREDIT_CARD: "CREDIT_CARD",
  APPLE_PAY: "APPLE_PAY",
  // EXTERNAL_WALLET: "EXTERNAL_WALLET", // not fully working yet
  EXTERNAL_WALLET_BROWSER: "EXTERNAL_WALLET_BROWSER",
} as const;

export type RadioKey = (typeof RADIO_KEYS)[keyof typeof RADIO_KEYS];

// Must also be whitelisted by the backend's payment adapter.
export const DEVICE_WALLET_PAYMENT_ASSETS = ["USDC", "USDT", "DAI"] as const;

// __DEV__-only; useWalletTokens.ts gates this the same way.
export const DEV_DEVICE_WALLET_PAYMENT_ASSETS = ["USDCt"] as const;

export type DeviceWalletPaymentAsset =
  | (typeof DEVICE_WALLET_PAYMENT_ASSETS)[number]
  | (typeof DEV_DEVICE_WALLET_PAYMENT_ASSETS)[number];

export const DEFAULT_DEVICE_WALLET_PAYMENT_ASSET: DeviceWalletPaymentAsset = "USDC";

export const PROMO_CODE_PATTERN = /^[A-Za-z0-9]{4,16}$/;

// Display copy for the platform biometric, e.g. "Your Kokio wallet lives on this
// phone and signs with the passkey you already use." Matches the label already
// used inline in StepUpPromptModal.
export const PASSKEY_LABEL = Platform.OS === "ios" ? "Face ID" : "Fingerprint";

// Inert until the mainnet cutover actually ships — flip to true then. Bump
// MAINNET_CUTOVER_VERSION in mainnetCutoverReset.ts instead if a second
// cutover is ever needed after this one.
export const MAINNET_CUTOVER_ENABLED = true;

// Store listings shared in referral invites.
export const OFFICIAL_URLS = {
  IOS: "https://apps.apple.com/app/kokio/id6799362847",
  ANDROID: "https://play.google.com/store/apps/details?id=app.kokio.mobile",
  WEBSITE: "https://kokio.app",
} as const;
