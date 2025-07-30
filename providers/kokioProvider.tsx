import { ReactNode, createContext, useEffect, useReducer } from "react";
import { Kokio } from "kokio-sdk";
import { returnViemWalletClient } from "@/utils/passkey";

import { useTurnkey, User } from "@turnkey/sdk-react-native";
import { TurnkeyClient } from "@turnkey/http";

import { PasskeyStamper } from "@turnkey/react-native-passkey-stamper";
import * as SecureStore from "expo-secure-store";
import { PASSKEY_CONFIG, TURNKEY_API_URL } from "@/constants/passkey.constant";

type AuthActionType =
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_KOKIO"; payload: any }
  | { type: "SET_KOKIO_USER"; payload: UserData }
  | { type: "SET_KOKIO_PASSKEY"; payload: UserPasskey }
  | { type: "CLEAR_KOKIO" }
  | { type: "CLEAR_KOKIO_USER" };

interface UserPasskey {
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
}
interface KokioState {
  error: string;
  sdk?: Kokio;
  userData?: UserData;
  userPasskey?: UserPasskey;
}

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  userData: undefined,
  userPasskey: undefined,
};

function kokioReducer(kokio: KokioState, action: AuthActionType): KokioState {
  switch (action.type) {
    case "ERROR":
      return { ...kokio, error: action.payload };
    case "CLEAR_ERROR":
      return { ...kokio, error: "" };
    case "SET_KOKIO":
      return { ...kokio, sdk: action.payload };
    case "SET_KOKIO_USER":
      return { ...kokio, userData: action.payload };
    case "SET_KOKIO_PASSKEY":
      return { ...kokio, userPasskey: action.payload };
    case "CLEAR_KOKIO":
      return {
        ...kokio,
        sdk: undefined,
      };
    case "CLEAR_KOKIO_USER":
      return {
        ...kokio,
        userPasskey: undefined,
        userData: undefined,
      };
    default:
      return kokio;
  }
}

export interface KokioProviderType {
  kokio: KokioState;
  clearError: () => void;
  setupKokio: () => void;
  setupKokioUserData: (user: User) => Promise<void>;
  setupKokioUserPasskey: (user: User, passkey: UserPasskey) => Promise<void>;
  clearKokio: () => void;
  clearKokioUser: () => Promise<void>;
}

export const KokioContext = createContext<KokioProviderType>({
  kokio: initialState,
  clearError: () => {},
  setupKokio: async () => Promise.resolve(),
  setupKokioUserData: async () => Promise.resolve(),
  setupKokioUserPasskey: async () => Promise.resolve(),
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});

interface KokioProviderProps {
  children: ReactNode;
}

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);
  const { user } = useTurnkey();

  const saveValueForUserData = async (key: string, value: UserData) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserPasskey = async (key: string, value: UserPasskey) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const getValueForUserData = async (key: string) => {
    let result = await SecureStore.getItemAsync(key);
    if (result) {
      console.log("🔐 Here's your user data value 🔐 \n" + result);
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
      console.log("🔐 Here's your passkey data value 🔐 \n" + result);
      const parsedResult: UserPasskey = JSON.parse(result);
      return parsedResult;
    } else {
      console.log("No passkey data values stored under that key.");
    }
  };

  const deleteValueForUser = async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key)
  };

  // Check if user is already saved with data inside the expo secure store then disable the passkey creation
  // and use the existing user data
  useEffect(() => {
    const fetchUserData = async () => {
      const userData = await getValueForUserData("userData");
      if (userData) {
        dispatch({
          type: "SET_KOKIO_USER",
          payload: {
            userName: userData.userName,
            email: userData.email,
            organizationId: userData.organizationId,
            id: userData.id,
          },
        });
        // if user data exists then return UserPasskey value from secure store
        const userPasskey = await getValueForUserPasskey(
          `userPasskey-${userData.id}`
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
      }
    };
    fetchUserData();
  }, []);

  // Check if user is already saved with data inside the expo secure store then disable the passkey creation
  // and use the existing user data
  useEffect(() => {
    if (user) {
      // If user is found, setup Kokio SDK with current user data and user organizationId from Turnkey
      setupKokio();
      setupKokioUserData(user);
    }
    if (!user) {
      // If user is not found, clear Kokio SDK and user data
      clearKokio();
    }
  }, [user]);

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioUserData = async (user: User) => {
    // Save user data to secure store
    await saveValueForUserData("userData", {
      id: user.id,
      organizationId: user.organizationId,
      userName: user.userName,
      email: user.email ?? "",
    });

    console.log("User data saved to secure store:", user);

    dispatch({
      type: "SET_KOKIO_USER",
      payload: {
        userName: user.userName,
        email: user.email ?? "",
        organizationId: user.organizationId,
        id: user.id,
      },
    });
  };

  const setupKokioUserPasskey = async (user: User, passkey: UserPasskey) => {
    // Save user passkey to secure store
    await saveValueForUserPasskey(`userPasskey-${user.id}`, {
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

  const setupKokio = async () => {
    // Check if user and turnkeyClient are defined before proceeding
    // Kokio SDK requires a Turnkey client to be initialized with a user
    if (!user) {
      dispatch({ type: "ERROR", payload: "User not found" });
      return;
    }

    const stamper = new PasskeyStamper({
      rpId: PASSKEY_CONFIG.RP_ID,
    });

    const turnkeyClient = new TurnkeyClient(
      { baseUrl: TURNKEY_API_URL },
      stamper
    );

    const viemClient = await returnViemWalletClient(user, turnkeyClient);

    const kokioSDK = new Kokio(
      viemClient,
      turnkeyClient,
      user.organizationId,
      process.env.EXPO_PUBLIC_GAS_MANAGER_POLICY_ID ?? ""
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

  const clearKokioUser = async () => {
    // Clear user data from secure store
    dispatch({ type: "CLEAR_KOKIO_USER" });
    await deleteValueForUser("userData");
    await clearKokio();
  };

  return (
    <KokioContext.Provider
      value={{
        kokio,
        clearError,
        setupKokio,
        setupKokioUserData,
        setupKokioUserPasskey,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};