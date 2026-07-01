import { ReactNode, createContext } from "react";
import type { Hex } from "viem";

type StoredTransactionData = {
  orderId: string;
  correlationId?: string;
  iccid?: string;
  planId?: string;
  orderStatus?: string;
  paymentMethod?: string;
  vendor?: string;
  esimId?: string;
  isNewESim?: boolean;
  installationDetails: {
    qrcode: string;
    appleInstallationUrl: string;
  };
};

type StoredPurchasedESIM = {
  eSimItem: unknown;
  transactionData: StoredTransactionData;
};

type KokioState = {
  error: string;
  sdk?: unknown;
  deviceUID: string;
  deviceWalletAddress: string;
  rawSalt: string;
  userData?: unknown;
  userPasskey?: unknown;
  userWallet?: unknown;
  purchasedESIMs: StoredPurchasedESIM[];
};

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
  deviceWalletAddress: "",
  rawSalt: "",
  userData: undefined,
  userPasskey: undefined,
  userWallet: undefined,
  purchasedESIMs: [],
};

export interface KokioProviderType {
  kokio: KokioState;
  clearError: () => void;
  setupKokio: () => void;
  setupKokioDeviceUID: (deviceUID: string) => Promise<void>;
  setupKokioUserWallet: (deviceUID: string, wallet: unknown) => Promise<void>;
  savePurchasedESIM: (
    deviceUID: string,
    eSimItem: unknown,
    transactionData: unknown,
    correlationId?: string | null
  ) => Promise<void>;
  upsertOrderRecord: (
    deviceUID: string,
    eSimItem: unknown,
    correlationId: string,
    orderStatus?: string
  ) => Promise<void>;
  setupKokioRegistration: (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
    publicKeyX: Hex,
    publicKeyY: Hex,
    rawSalt: string
  ) => Promise<void>;
  clearKokio: () => void;
  clearKokioUser: () => Promise<void>;
}

const defaultValue: KokioProviderType = {
  kokio: initialState,
  clearError: () => {},
  setupKokio: () => {},
  setupKokioDeviceUID: async () => {},
  setupKokioUserWallet: async () => {},
  savePurchasedESIM: async () => {},
  upsertOrderRecord: async () => {},
  setupKokioRegistration: async () => {},
  clearKokio: () => {},
  clearKokioUser: async () => {},
};

export const KokioContext = createContext<KokioProviderType>(defaultValue);

export function KokioProvider({ children }: { children: ReactNode }) {
  return (
    <KokioContext.Provider value={defaultValue}>
      {children}
    </KokioContext.Provider>
  );
}
