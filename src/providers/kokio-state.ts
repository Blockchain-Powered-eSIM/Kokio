import { createContext } from "react";
import type { Kokio } from "kokio-sdk";
import type { KokioSmartAccount } from "kokio-sdk/types";
import type { Hex } from "viem";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPasskey {
  credentialId: string;
  x: Hex;
  y: Hex;
}

export interface UserData {
  id: string;
  wallets: { address: string }[];
}

type AuthActionType =
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_KOKIO"; payload: Kokio }
  | { type: "SET_DEVICE_UID"; payload: string }
  | { type: "SET_DEVICE_WALLET_ADDRESS"; payload: string }
  | { type: "SET_RAW_SALT"; payload: string }
  | { type: "SET_KOKIO_USER"; payload: UserData }
  | { type: "SET_KOKIO_PASSKEY"; payload: UserPasskey }
  | { type: "SET_USER_WALLET"; payload: KokioSmartAccount }
  | { type: "SET_WALLET_DEPLOYING"; payload: boolean }
  | { type: "SET_WALLET_DEPLOYMENT_ERROR"; payload: string | null }
  | { type: "CLEAR_KOKIO" }
  | { type: "CLEAR_KOKIO_USER" };

interface KokioState {
  error: string;
  sdk?: Kokio;
  deviceUID: string;
  deviceWalletAddress: string;
  rawSalt: string;
  userData?: UserData;
  userPasskey?: UserPasskey;
  userWallet?: KokioSmartAccount;
  // True while beginWalletDeploymentWatch is confirming an in-progress
  // deployment in the background (submitted, not yet DEPLOYED). Purely
  // informational for UI, e.g. a "setting up your wallet" hint.
  isWalletDeploying: boolean;
  // Set when beginWalletDeploymentWatch gives up on a terminal STALLED/FAILED
  // deployment (a real backend-reported failure, not a timeout that might
  // still resolve later). Cleared at the start of the next attempt. UI should
  // show this instead of silently reverting to the "no wallet yet" prompt.
  walletDeploymentError: string | null;
}

export const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
  deviceWalletAddress: "",
  rawSalt: "",
  userData: undefined,
  userPasskey: undefined,
  userWallet: undefined,
  isWalletDeploying: false,
  walletDeploymentError: null,
};

export function kokioReducer(kokio: KokioState, action: AuthActionType): KokioState {
  switch (action.type) {
    case "ERROR":
      return { ...kokio, error: action.payload };
    case "CLEAR_ERROR":
      return { ...kokio, error: "" };
    case "SET_KOKIO":
      return { ...kokio, sdk: action.payload };
    case "SET_DEVICE_UID":
      return { ...kokio, deviceUID: action.payload };
    case "SET_DEVICE_WALLET_ADDRESS":
      return { ...kokio, deviceWalletAddress: action.payload };
    case "SET_RAW_SALT":
      return { ...kokio, rawSalt: action.payload };
    case "SET_KOKIO_USER":
      return { ...kokio, userData: action.payload };
    case "SET_KOKIO_PASSKEY":
      return { ...kokio, userPasskey: action.payload };
    case "SET_USER_WALLET":
      return { ...kokio, userWallet: action.payload };
    case "SET_WALLET_DEPLOYING":
      return { ...kokio, isWalletDeploying: action.payload };
    case "SET_WALLET_DEPLOYMENT_ERROR":
      return { ...kokio, walletDeploymentError: action.payload };
    case "CLEAR_KOKIO":
      return { ...kokio, sdk: undefined };
    case "CLEAR_KOKIO_USER":
      return {
        ...kokio,
        deviceUID: "",
        deviceWalletAddress: "",
        rawSalt: "",
        userPasskey: undefined,
        userData: undefined,
        userWallet: undefined,
        isWalletDeploying: false,
        walletDeploymentError: null,
      };
    default:
      return kokio;
  }
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface KokioProviderType {
  kokio: KokioState;
  clearError: () => void;
  setupKokio: () => void;
  setupKokioDeviceUID: (deviceUID: string) => Promise<void>;
  setupKokioUserWallet: (deviceUID: string, wallet: KokioSmartAccount) => Promise<void>;
  setupKokioRegistration: (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
    publicKeyX: Hex,
    publicKeyY: Hex,
    rawSalt: string,
  ) => Promise<void>;
  setupKokioRecovery: (deviceWalletAddress: string, credentialId: string) => Promise<void>;
  beginWalletDeploymentWatch: () => void;
  ensureSmartAccountUpgraded: () => Promise<Kokio | null>;
  clearKokio: () => void;
  clearKokioUser: () => Promise<void>;
}

export const KokioContext = createContext<KokioProviderType>({
  kokio: initialState,
  clearError: () => {},
  setupKokio: async () => Promise.resolve(),
  setupKokioDeviceUID: async () => Promise.resolve(),
  setupKokioUserWallet: async () => Promise.resolve(),
  setupKokioRegistration: async (_a, _b, _c, _d, _e, _f) => Promise.resolve(),
  setupKokioRecovery: async (_a, _b) => Promise.resolve(),
  beginWalletDeploymentWatch: () => {},
  ensureSmartAccountUpgraded: async () => Promise.resolve(null),
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});
