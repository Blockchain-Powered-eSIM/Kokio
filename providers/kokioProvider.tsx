import { ReactNode, createContext, useEffect, useReducer } from "react";
import _pick from "lodash/pick";
import _get from "lodash/get";
import { Kokio } from "kokio-sdk";
import { PASSKEY_CONFIG, TURNKEY_API_URL } from "@/constants/passkey.constants";
import { returnViemWalletClient } from "@/utils/passkey";
import Constants from "expo-constants";
import { AppExtraConfig } from "@/appKeys";
const extra = Constants.expoConfig?.extra as AppExtraConfig;

import { useTurnkey, User, Wallet } from "@turnkey/sdk-react-native";
import { TurnkeyClient } from "@turnkey/sdk-react-native";
import { SmartContractAccount } from "@aa-sdk/core";

import { PasskeyStamper } from "@turnkey/react-native-passkey-stamper";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
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
  | { type: "SET_KOKIO_USER"; payload: UserData }
  | { type: "SET_KOKIO_PASSKEY"; payload: UserPasskey }
  | { type: "SET_USER_WALLET"; payload: SmartContractAccount }
  | { type: "SET_PURCHASED_ESIMS"; payload: StoredPurchasedESIM[] }
  | { type: "CLEAR_KOKIO" }
  | { type: "CLEAR_KOKIO_USER" };

export interface UserPasskey {
  x: string;
  y: string;
  attestationObject: string;
  clientDataJson: string;
  credentialId: string;
}

interface UserData {
  userName: string;
  email: string;
  organizationId: string;
  id: string;
  wallets: Wallet[];
}
interface KokioState {
  error: string;
  sdk?: Kokio;
  deviceUID: string;
  userData?: UserData;
  userPasskey?: UserPasskey;
  userWallet?: SmartContractAccount;
  purchasedESIMs: StoredPurchasedESIM[];
}

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
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
  setupKokioUserData: (deviceUID: string, user: User) => Promise<void>;
  setupKokioUserPasskey: (
    deviceUID: string,
    passkey: UserPasskey
  ) => Promise<void>;
  setupKokioUserWallet: (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => Promise<void>;
  savePurchasedESIM: (
    deviceUID: string,
    eSimItem: Esim,
    transactionData: any // TODO: Create a type for this once BE contract is finalized
  ) => Promise<void>;
  clearKokio: () => void;
  clearKokioUser: (user: User | undefined) => Promise<void>;
}

export const KokioContext = createContext<KokioProviderType>({
  kokio: initialState,
  clearError: () => {},
  setupKokio: async () => Promise.resolve(),
  setupKokioDeviceUID: async () => Promise.resolve(),
  setupKokioUserData: async () => Promise.resolve(),
  setupKokioUserPasskey: async () => Promise.resolve(),
  setupKokioUserWallet: async () => Promise.resolve(),
  savePurchasedESIM: async () => Promise.resolve(),
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});

interface KokioProviderProps {
  children: ReactNode;
}

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);
  const { user, clearSession } = useTurnkey();
  const { reauthenticate } = useAuthRelay();

  const saveValueForDeviceUID = async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserData = async (key: string, value: UserData) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserPasskey = async (key: string, value: UserPasskey) => {
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
      console.log("🔐 Here's your device UIdD: 🔐 \n" + result);
      const parsedResult: string = JSON.parse(result);
      return parsedResult;
    } else {
      console.log("No device UID value stored under that key.");
    }
  };

  const getValueForUserData = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      console.log("🔐 Here's your user data: 🔐 \n" + result);
      const parsedResult: UserData = JSON.parse(result);
      return parsedResult;
    } else {
      console.log("No user data values stored under that key.");
    }
  };

  const getValueForUserPasskey = async (
    key: string
  ): Promise<UserPasskey | void> => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      console.log("🔐 Here's your passkey data: 🔐 \n" + result);
      const parsedResult: UserPasskey = JSON.parse(result);
      return parsedResult;
    } else {
      console.log("No passkey data values stored under that key.");
    }
  };

  const getValueForUserWallet = async (
    key: string
  ): Promise<SmartContractAccount | void> => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      console.log("🔐 Here's your wallet data 🔐 \n" + result);
      const parsedResult: SmartContractAccount = JSON.parse(result);
      return parsedResult;
    } else {
      console.log("No wallet data stored under that key.");
    }
  };

  const saveValueForPurchasedESIMs = async (
    key: string,
    value: StoredPurchasedESIM[]
  ) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      console.log("✅ Purchased eSIMs saved to AsyncStorage");
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
        console.log("🔐 Here's your purchased eSIMs data 🔐 \n" + result);
        const parsedResult: StoredPurchasedESIM[] = JSON.parse(result);
        return parsedResult;
      } else {
        console.log("No purchased eSIMs data stored under that key.");
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
      console.log("🗑️ Purchased eSIMs deleted from AsyncStorage");
    } catch (error) {
      console.error("Error deleting purchased eSIMs from AsyncStorage:", error);
    }
  };

  const deleteValueForUser = async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  };

  // Check if user is already saved with data inside the expo secure store then disable the passkey creation
  // and use the existing user data
  useEffect(() => {
    const fetchUserData = async () => {
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
        const userPasskey = await getValueForUserPasskey(
          `userPasskey-${deviceUID}`
        );
        if (userPasskey) {
          dispatch({
            type: "SET_KOKIO_PASSKEY",
            payload: {
              x: userPasskey.x,
              y: userPasskey.y,
              attestationObject: userPasskey.attestationObject,
              clientDataJson: userPasskey.clientDataJson,
              credentialId: userPasskey.credentialId,
            },
          });
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

  // Check if user is already saved with data inside the expo secure store then disable the passkey creation
  // and use the existing user data
  useEffect(() => {
    if (!kokio.sdk && user && kokio.deviceUID && kokio.userPasskey) {
      // If user is found, setup Kokio SDK with current user data and user organizationId from Turnkey
      setupKokioUserData(kokio.deviceUID, user);
      setupKokio();
    }
    if (!user) {
      // If user is not found, clear Kokio SDK
      clearKokio();
      reauthenticate();
    }
  }, [user, kokio.deviceUID, kokio.userPasskey, kokio.sdk]);

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveValueForDeviceUID("deviceUID", deviceUID);

    console.log("Device UID saved to secure store:", deviceUID);

    dispatch({
      type: "SET_DEVICE_UID",
      payload: deviceUID,
    });
  };

  const setupKokioUserData = async (deviceUID: string, user: User) => {
    // Save user data to secure store
    await saveValueForUserData(`userData-${deviceUID}`, {
      id: user.id,
      organizationId: user.organizationId,
      userName: user.userName,
      email: user.email ?? "",
      wallets: user.wallets || [],
    });

    console.log("User data saved to secure store:", user);

    dispatch({
      type: "SET_KOKIO_USER",
      payload: {
        userName: user.userName,
        email: user.email ?? "",
        organizationId: user.organizationId,
        id: user.id,
        wallets: user.wallets || [],
      },
    });
  };

  const setupKokioUserPasskey = async (
    deviceUID: string,
    passkey: UserPasskey
  ) => {
    // Save user passkey to secure store
    await saveValueForUserPasskey(`userPasskey-${deviceUID}`, {
      x: passkey.x,
      y: passkey.y,
      attestationObject: passkey.attestationObject,
      clientDataJson: passkey.clientDataJson,
      credentialId: passkey.credentialId,
    });

    console.log("User passkey saved to secure store:", passkey);

    dispatch({
      type: "SET_KOKIO_PASSKEY",
      payload: {
        x: passkey.x,
        y: passkey.y,
        attestationObject: passkey.attestationObject,
        clientDataJson: passkey.clientDataJson,
        credentialId: passkey.credentialId,
      },
    });
  };

  const setupKokioUserWallet = async (
    deviceUID: string,
    wallet: SmartContractAccount
  ) => {
    // Save user passkey to secure store
    await saveValueForUserWallet(`userWallet-${deviceUID}`, wallet);

    console.log("User wallet saved to secure store:", wallet);

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
    // Get existing purchased eSIMs
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

    console.log("Purchased eSIM saved to AsyncStorage:", reducedPurchasedESIM);

    // Update reducer
    dispatch({
      type: "SET_PURCHASED_ESIMS",
      payload: updatedESIMs,
    });
  };

  const setupKokio = async () => {
    // Check if user and turnkeyClient are defined before proceeding
    // Kokio SDK requires a Turnkey client to be initialized with a user
    if (!user) {
      dispatch({ type: "ERROR", payload: "User not found" });
      return;
    }

    if (!kokio.userPasskey?.credentialId) {
      dispatch({ type: "ERROR", payload: "Credential Id not found" });
      return;
    }

    const stamper = new PasskeyStamper({
      rpId: PASSKEY_CONFIG.RP_ID,
    });

    const turnkeyClient = new TurnkeyClient(
      { baseUrl: TURNKEY_API_URL },
      stamper
    );

    const viemClient = await returnViemWalletClient(
      user,
      turnkeyClient,
      kokio.userWallet?.address ?? ""
    );

    const kokioSDK = new Kokio(
      viemClient,
      turnkeyClient,
      kokio.userPasskey?.credentialId,
      PASSKEY_CONFIG.RP_ID,
      extra.turnkeyOrganizationId ?? "",
      extra.pimlicoApiKey ?? "",
      extra.gasManagerPolicyId ?? ""
    );

    if (!kokioSDK) {
      dispatch({ type: "ERROR", payload: "Kokio SDK not initialized" });
      return;
    }

    dispatch({ type: "SET_KOKIO", payload: kokioSDK });
  };
  const clearKokio = () => {
    dispatch({ type: "CLEAR_KOKIO" });
  };

  const clearKokioUser = async (_user: User | undefined) => {
    // Clear user data from secure store and AsyncStorage
    dispatch({ type: "CLEAR_KOKIO_USER" });
    await deleteValueForUser(`userPasskey-${kokio.deviceUID}`);
    await deleteValueForUser(`userWallet-${kokio.deviceUID}`);
    await deleteValueForUser(`userData-${kokio.deviceUID}`);
    await deleteValueForPurchasedESIMs(`purchasedESIMs-${kokio.deviceUID}`);
    await deleteValueForUser("deviceUID");
    await clearKokio();
    await clearSession();
  };

  return (
    <KokioContext.Provider
      value={{
        kokio,
        clearError,
        setupKokio,
        setupKokioDeviceUID,
        setupKokioUserData,
        setupKokioUserPasskey,
        setupKokioUserWallet,
        savePurchasedESIM,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};
