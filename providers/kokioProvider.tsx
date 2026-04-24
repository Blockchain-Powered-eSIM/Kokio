import { ReactNode, createContext, useEffect, useReducer } from "react";
import _pick from "lodash/pick";
import _get from "lodash/get";
import { Kokio } from "kokio-sdk";
import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import Constants from "expo-constants";
import { AppExtraConfig } from "@/appKeys";
const extra = Constants.expoConfig?.extra as AppExtraConfig;

import { SmartContractAccount } from "@aa-sdk/core";

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Esim } from "@/components/ESIMItem";

export interface StoredTransactionData {
  orderId: string;
  iccid: string;
  installationDetails: {
    qrcode: string;
    appleInstallationUrl: string;
  };
}

export interface StoredPurchasedESIM {
  eSimItem: Esim;
  transactionData: StoredTransactionData;
}

const reduceESimDataForStorage = (
  eSimItem: Esim,
  transactionData: any
): StoredPurchasedESIM => {
  const reducedESimItem = _pick(eSimItem, [
    "catalogueId",
    "data",
    "sms",
    "voice",
    "validity",
    "isUnlimited",
    "coverageType",
    "serviceRegionCode",
    "serviceRegionName",
    "serviceRegionFlag",
  ]) as Esim;

  const reducedTransactionData: StoredTransactionData = {
    orderId: _get(transactionData, "orderId", ""),
    iccid: _get(transactionData, "iccid", ""),
    installationDetails: {
      qrcode: _get(transactionData, "installationDetails.qrcode", ""),
      appleInstallationUrl: _get(
        transactionData,
        "installationDetails.appleInstallationUrl",
        ""
      ),
    },
  };

  return {
    eSimItem: reducedESimItem,
    transactionData: reducedTransactionData,
  };
};

type AuthActionType =
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_KOKIO"; payload: any }
  | { type: "SET_DEVICE_UID"; payload: string }
  | { type: "SET_DEVICE_WALLET_ADDRESS"; payload: string }
  | { type: "SET_KOKIO_USER"; payload: UserData }
  | { type: "SET_KOKIO_PASSKEY"; payload: UserPasskey }
  | { type: "SET_USER_WALLET"; payload: SmartContractAccount }
  | { type: "SET_PURCHASED_ESIMS"; payload: StoredPurchasedESIM[] }
  | { type: "CLEAR_KOKIO" }
  | { type: "CLEAR_KOKIO_USER" };

export interface UserPasskey {
  credentialId: string;
}

interface UserData {
  userName: string;
  email: string;
  organizationId: string;
  id: string;
  wallets: { address: string }[];
}
interface KokioState {
  error: string;
  sdk?: Kokio;
  deviceUID: string;
  deviceWalletAddress: string;
  userData?: UserData;
  userPasskey?: UserPasskey;
  userWallet?: SmartContractAccount;
  purchasedESIMs: StoredPurchasedESIM[];
}

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
  deviceWalletAddress: "",
  userData: undefined,
  userPasskey: undefined,
  userWallet: undefined,
  purchasedESIMs: [],
};

function kokioReducer(kokio: KokioState, action: AuthActionType): KokioState {
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
    case "SET_KOKIO_USER":
      return { ...kokio, userData: action.payload };
    case "SET_KOKIO_PASSKEY":
      return { ...kokio, userPasskey: action.payload };
    case "SET_USER_WALLET":
      return { ...kokio, userWallet: action.payload };
    case "SET_PURCHASED_ESIMS":
      return { ...kokio, purchasedESIMs: action.payload };
    case "CLEAR_KOKIO":
      return {
        ...kokio,
        sdk: undefined,
      };
    case "CLEAR_KOKIO_USER":
      return {
        ...kokio,
        deviceUID: "",
        deviceWalletAddress: "",
        userPasskey: undefined,
        userData: undefined,
        userWallet: undefined,
        purchasedESIMs: [],
      };
    default:
      return kokio;
  }
}

export interface KokioProviderType {
  kokio: KokioState;
  clearError: () => void;
  setupKokio: () => void;
  setupKokioDeviceUID: (deviceUID: string) => Promise<void>;
  setupKokioUserWallet: (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => Promise<void>;
  savePurchasedESIM: (
    deviceUID: string,
    eSimItem: Esim,
    transactionData: any // TODO: Create a type for this once BE contract is finalized
  ) => Promise<void>;
  setupKokioRegistration: (deviceWalletAddress: string, deviceUniqueIdentifier: string, credentialId: string) => Promise<void>;
  clearKokio: () => void;
  clearKokioUser: () => Promise<void>;
}

export const KokioContext = createContext<KokioProviderType>({
  kokio: initialState,
  clearError: () => {},
  setupKokio: async () => Promise.resolve(),
  setupKokioDeviceUID: async () => Promise.resolve(),
  setupKokioUserWallet: async () => Promise.resolve(),
  savePurchasedESIM: async () => Promise.resolve(),
  setupKokioRegistration: async () => Promise.resolve(),
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});

interface KokioProviderProps {
  children: ReactNode;
}

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);

  const saveValueForDeviceUID = async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserData = async (key: string, value: UserData) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserWallet = async (
    key: string,
    value: SmartContractAccount
  ) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const getValueForDeviceUID = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: string = JSON.parse(result);
      return parsedResult;
    }
  };

  const getValueForUserData = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: UserData = JSON.parse(result);
      return parsedResult;
    }
  };

  const getValueForUserWallet = async (
    key: string
  ): Promise<SmartContractAccount | void> => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      const parsedResult: SmartContractAccount = JSON.parse(result);
      return parsedResult;
    }
  };

  const saveValueForPurchasedESIMs = async (
    key: string,
    value: StoredPurchasedESIM[]
  ) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving purchased eSIMs to AsyncStorage:", error);
    }
  };

  const getValueForPurchasedESIMs = async (
    key: string
  ): Promise<StoredPurchasedESIM[] | void> => {
    try {
      const result = await AsyncStorage.getItem(key);
      if (result) {
        const parsedResult: StoredPurchasedESIM[] = JSON.parse(result);
        return parsedResult;
      }
    } catch (error) {
      console.error(
        "Error retrieving purchased eSIMs from AsyncStorage:",
        error
      );
    }
  };

  const deleteValueForPurchasedESIMs = async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error deleting purchased eSIMs from AsyncStorage:", error);
    }
  };

  const deleteValueForUser = async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const storedWalletAddress = await SecureStore.getItemAsync("deviceWalletAddress");
      if (storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: storedWalletAddress });
      }

      const deviceUID = await getValueForDeviceUID("deviceUID");

      if (deviceUID) {
        dispatch({
          type: "SET_DEVICE_UID",
          payload: deviceUID,
        });

        const userData = await getValueForUserData(`userData-${deviceUID}`);
        if (userData) {
          dispatch({
            type: "SET_KOKIO_USER",
            payload: {
              userName: userData.userName,
              email: userData.email,
              organizationId: userData.organizationId,
              id: userData.id,
              wallets: userData.wallets,
            },
          });
        }
        const credentialId = await SecureStore.getItemAsync('credentialId');
        if (credentialId) {
          dispatch({ type: "SET_KOKIO_PASSKEY", payload: { credentialId } });
        }
        const userWallet = await getValueForUserWallet(
          `userWallet-${deviceUID}`
        );
        if (userWallet) {
          dispatch({
            type: "SET_USER_WALLET",
            payload: userWallet,
          });
        }
        const purchasedESIMs = await getValueForPurchasedESIMs(
          `purchasedESIMs-${deviceUID}`
        );
        if (purchasedESIMs) {
          dispatch({
            type: "SET_PURCHASED_ESIMS",
            payload: purchasedESIMs,
          });
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!kokio.sdk && kokio.deviceUID && kokio.userPasskey) {
      setupKokio();
    }
  }, [kokio.deviceUID, kokio.userPasskey, kokio.sdk]);

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveValueForDeviceUID("deviceUID", deviceUID);

    dispatch({
      type: "SET_DEVICE_UID",
      payload: deviceUID,
    });
  };

  const setupKokioRegistration = async (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
  ) => {
    await saveValueForDeviceUID("deviceUID", deviceUniqueIdentifier);
    await SecureStore.setItemAsync("deviceWalletAddress", deviceWalletAddress);
    await SecureStore.setItemAsync("credentialId", credentialId);

    const userData: UserData = {
      id: deviceUniqueIdentifier,
      userName: "",
      email: "",
      organizationId: "",
      wallets: [{ address: deviceWalletAddress }],
    };
    await saveValueForUserData(`userData-${deviceUniqueIdentifier}`, userData);

    dispatch({ type: "SET_DEVICE_UID", payload: deviceUniqueIdentifier });
    dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: deviceWalletAddress });
    dispatch({ type: "SET_KOKIO_USER", payload: userData });
    dispatch({ type: "SET_KOKIO_PASSKEY", payload: { credentialId } });
  };

  const setupKokioUserWallet = async (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => {
    await saveValueForUserWallet(`userWallet-${deviceUID}`, wallet);

    dispatch({
      type: "SET_USER_WALLET",
      payload: wallet,
    });
  };

  const savePurchasedESIM = async (
    deviceUID: string,
    eSimItem: Esim,
    transactionData: any
  ) => {
    const existingESIMs = await getValueForPurchasedESIMs(
      `purchasedESIMs-${deviceUID}`
    );
    const currentESIMs = existingESIMs || [];

    const reducedPurchasedESIM = reduceESimDataForStorage(
      eSimItem,
      transactionData
    );

    const updatedESIMs = [...currentESIMs, reducedPurchasedESIM];

    await saveValueForPurchasedESIMs(
      `purchasedESIMs-${deviceUID}`,
      updatedESIMs
    );

    dispatch({
      type: "SET_PURCHASED_ESIMS",
      payload: updatedESIMs,
    });
  };

  const setupKokio = async () => {
    // Prefer state (populated at mount or registration); fall back to SecureStore
    // for the case where setupKokio() is called before hydration completes.
    const credentialId =
      kokio.userPasskey?.credentialId ??
      await SecureStore.getItemAsync('credentialId') ??
      null;

    if (!credentialId) {
      dispatch({ type: "ERROR", payload: "Credential ID not found" });
      return;
    }

    const rpcUrl = extra.alchemyApiKey
      ? `https://base-sepolia.g.alchemy.com/v2/${extra.alchemyApiKey}`
      : 'https://sepolia.base.org';

    const viemClient = createWalletClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const kokioSDK = new Kokio(
      viemClient,
      credentialId,
      PASSKEY_CONFIG.RP_ID,
      '',
      extra.pimlicoApiKey ?? '',
      extra.gasManagerPolicyId ?? '',
    );

    dispatch({ type: "SET_KOKIO", payload: kokioSDK });
  };

  const clearKokio = () => {
    dispatch({ type: "CLEAR_KOKIO" });
  };

  const clearKokioUser = async () => {
    dispatch({ type: "CLEAR_KOKIO_USER" });
    await deleteValueForUser(`userWallet-${kokio.deviceUID}`);
    await deleteValueForUser(`userData-${kokio.deviceUID}`);
    await deleteValueForPurchasedESIMs(`purchasedESIMs-${kokio.deviceUID}`);
    await deleteValueForUser("deviceUID");
    await SecureStore.deleteItemAsync("deviceWalletAddress");
    await SecureStore.deleteItemAsync("credentialId");
    clearKokio();
  };

  return (
    <KokioContext.Provider
      value={{
        kokio,
        clearError,
        setupKokio,
        setupKokioDeviceUID,
        setupKokioUserWallet,
        savePurchasedESIM,
        setupKokioRegistration,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};
