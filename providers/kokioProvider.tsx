import React, { ReactNode, createContext, useEffect, useReducer, useRef } from "react";
import { router } from "expo-router";
import { Kokio } from "kokio-sdk";
import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
import { createWalletClient, http, type Address, type Hex } from "viem";
import { baseSepolia, base } from "viem/chains";
import Constants from "expo-constants";
import { AppExtraConfig, Config } from "@/appKeys";
import { SmartContractAccount } from "@aa-sdk/core";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccount } from "@/utils/bff/account";
import {
  getWcSignClient,
  setPendingProposal,
} from "@/utils/walletconnect/signClient";
import { logger } from "@/utils/logger";
import { checkWalletDeployed } from "@/utils/wallet/checkWalletDeployed";
import { subscribeAccountDeleted } from '@/utils/auth/accountDeleted';
import { isAccountDeletedError } from "@/utils/bff/errors";

const extra = Constants.expoConfig?.extra as AppExtraConfig;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPasskey {
  credentialId: string;
  x: Hex;
  y: Hex;
}

interface UserData {
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
  | { type: "SET_USER_WALLET"; payload: SmartContractAccount }
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
  userWallet?: SmartContractAccount;
}

const initialState: KokioState = {
  error: "",
  sdk: undefined,
  deviceUID: "",
  deviceWalletAddress: "",
  rawSalt: "",
  userData: undefined,
  userPasskey: undefined,
  userWallet: undefined,
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
    case "SET_RAW_SALT":
      return { ...kokio, rawSalt: action.payload };
    case "SET_KOKIO_USER":
      return { ...kokio, userData: action.payload };
    case "SET_KOKIO_PASSKEY":
      return { ...kokio, userPasskey: action.payload };
    case "SET_USER_WALLET":
      return { ...kokio, userWallet: action.payload };
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
  setupKokioUserWallet: (deviceUID: string, wallet: SmartContractAccount) => Promise<void>;
  setupKokioRegistration: (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
    publicKeyX: Hex,
    publicKeyY: Hex,
    rawSalt: string,
  ) => Promise<void>;
  setupKokioRecovery: (deviceWalletAddress: string, credentialId: string) => Promise<void>;
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
  clearKokio: () => {},
  clearKokioUser: async () => Promise.resolve(),
});

interface KokioProviderProps {
  children: ReactNode;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);

  // ── SecureStore helpers ───────────────────────────────────────────────────

  const saveValueForDeviceUID = async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserData = async (key: string, value: UserData) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const saveValueForUserWallet = async (key: string, value: SmartContractAccount) => {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  };

  const getValueForDeviceUID = async (key: string): Promise<string | undefined> => {
    const result = await SecureStore.getItemAsync(key);
    if (result) return JSON.parse(result) as string;
  };

  const getValueForUserData = async (key: string): Promise<UserData | undefined> => {
    const result = await SecureStore.getItemAsync(key);
    if (result) return JSON.parse(result) as UserData;
  };

  const getValueForUserWallet = async (key: string): Promise<SmartContractAccount | undefined> => {
    const result = await SecureStore.getItemAsync(key);
    if (result) return JSON.parse(result) as SmartContractAccount;
  };

  const deleteValueForUser = async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveValueForDeviceUID("deviceUID", deviceUID);
    dispatch({ type: "SET_DEVICE_UID", payload: deviceUID });
  };

  const setupKokio = async () => {
    const credentialId =
      kokio.userPasskey?.credentialId ??
      await SecureStore.getItemAsync('credentialId') ??
      null;

    if (!credentialId) {
      dispatch({ type: "ERROR", payload: "Credential ID not found" });
      return;
    }

    const resolvedAddress =
      kokio.deviceWalletAddress ||
      await SecureStore.getItemAsync('deviceWalletAddress');

    if (!resolvedAddress) {
      dispatch({ type: "ERROR", payload: "Device wallet address not found" });
      return;
    }

    const signerAddress    = resolvedAddress as `0x${string}`;
    const chainId          = Config.CHAIN_ID ?? baseSepolia.id;
    const chain            = chainId === base.id ? base : baseSepolia;
    const alchemySubdomain = chainId === base.id ? 'base-mainnet' : 'base-sepolia';

    const rpcUrl = extra.alchemyApiKey
      ? `https://${alchemySubdomain}.g.alchemy.com/v2/${extra.alchemyApiKey}`
      : (Config.CHAIN_RPC_URL ?? chain.rpcUrls.default.http[0]);

    const viemClient = createWalletClient({
      chain,
      transport: http(rpcUrl),
      account: signerAddress,
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

  const setupKokioRegistration = async (
    deviceWalletAddress: string,
    deviceUniqueIdentifier: string,
    credentialId: string,
    publicKeyX: Hex,
    publicKeyY: Hex,
    rawSalt: string,
  ) => {
    await saveValueForDeviceUID("deviceUID", deviceUniqueIdentifier);
    await SecureStore.setItemAsync("deviceWalletAddress", deviceWalletAddress);
    await SecureStore.setItemAsync("credentialId", credentialId);
    await SecureStore.setItemAsync("publicKeyX", publicKeyX);
    await SecureStore.setItemAsync("publicKeyY", publicKeyY);
    await SecureStore.setItemAsync("rawSalt", rawSalt);

    const userData: UserData = {
      id: deviceUniqueIdentifier,
      wallets: [{ address: deviceWalletAddress }],
    };
    await saveValueForUserData(`userData-${deviceUniqueIdentifier}`, userData);

    dispatch({ type: "SET_DEVICE_UID",            payload: deviceUniqueIdentifier });
    dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: deviceWalletAddress });
    dispatch({ type: "SET_RAW_SALT",              payload: rawSalt });
    dispatch({ type: "SET_KOKIO_USER",            payload: userData });
    dispatch({ type: "SET_KOKIO_PASSKEY",         payload: { credentialId, x: publicKeyX, y: publicKeyY } });
  };

  const setupKokioUserWallet = async (deviceUID: string, wallet: SmartContractAccount) => {
    await saveValueForUserWallet(`userWallet-${deviceUID}`, wallet);
    dispatch({ type: "SET_USER_WALLET", payload: wallet });
  };

  const setupKokioRecovery = async (deviceWalletAddress: string, credentialId: string) => {
    await SecureStore.setItemAsync('deviceWalletAddress', deviceWalletAddress);
    await SecureStore.setItemAsync('credentialId', credentialId);
    dispatch({ type: 'SET_DEVICE_WALLET_ADDRESS', payload: deviceWalletAddress });

    try {
      const account = await getAccount();
      await saveValueForDeviceUID('deviceUID', account.deviceUniqueIdentifier);
      await SecureStore.setItemAsync('publicKeyX', account.pubKeyX);
      await SecureStore.setItemAsync('publicKeyY', account.pubKeyY);
      await SecureStore.setItemAsync('rawSalt',    account.salt);
  
      dispatch({ type: 'SET_DEVICE_UID',    payload: account.deviceUniqueIdentifier });
      dispatch({ type: 'SET_RAW_SALT',      payload: account.salt });
      dispatch({
        type: 'SET_KOKIO_PASSKEY',
        payload: { credentialId, x: account.pubKeyX as Hex, y: account.pubKeyY as Hex },
      });
      // userWallet is intentionally NOT set here.
      // The initSdkAndDeriveWallet useEffect calls checkWalletDeployed once the SDK is ready.
    } catch (err) {
      if ( isAccountDeletedError(err) ) {
        // Terminal
        logger.debug('RECOVERY_ABORTED_ACCOUNT_DELETED');
        throw err;
      }
    }
  };

  const clearKokio = () => {
    dispatch({ type: "CLEAR_KOKIO" });
  };

  const clearKokioUser = async () => {
    dispatch({ type: "CLEAR_KOKIO_USER" });
    await deleteValueForUser(`userWallet-${kokio.deviceUID}`).catch(() => {});
    await deleteValueForUser(`userData-${kokio.deviceUID}`).catch(() => {});
    await AsyncStorage.removeItem(`purchasedESIMs-${kokio.deviceUID}`).catch(() => {});
    await deleteValueForUser("deviceUID").catch(() => {});
    await SecureStore.deleteItemAsync("deviceWalletAddress").catch(() => {});
    await SecureStore.deleteItemAsync("credentialId").catch(() => {});
    await SecureStore.deleteItemAsync("publicKeyX").catch(() => {});
    await SecureStore.deleteItemAsync("publicKeyY").catch(() => {});
    await SecureStore.deleteItemAsync("rawSalt").catch(() => {});
    clearKokio();
  };

  // ── Boot hydration ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchUserData = async () => {
      const storedWalletAddress = await SecureStore.getItemAsync("deviceWalletAddress");
      if (storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: storedWalletAddress });
      }

      const deviceUID = await getValueForDeviceUID("deviceUID");

      if (deviceUID && !storedWalletAddress) {
        await SecureStore.deleteItemAsync("deviceUID");
        await SecureStore.deleteItemAsync("credentialId");
        logger.debug('KOKIO_PURGED_ORPHAN_DEVICEUID');
      }

      if (deviceUID && storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_UID", payload: deviceUID });

        const userData = await getValueForUserData(`userData-${deviceUID}`);
        if (userData) {
          dispatch({
            type: "SET_KOKIO_USER",
            payload: {
              id: userData.id,
              wallets: userData.wallets,
            },
          });
        }

        const credentialId = await SecureStore.getItemAsync('credentialId');
        const publicKeyX   = await SecureStore.getItemAsync('publicKeyX');
        const publicKeyY   = await SecureStore.getItemAsync('publicKeyY');
        logger.debug('KOKIO_SECURESTORE_HYDRATION', {
          hasDeviceWalletAddress: !!storedWalletAddress,
          hasCredentialId:        !!credentialId,
          hasPublicKeyX:          !!publicKeyX,
          hasPublicKeyY:          !!publicKeyY,
          hasRawSalt:             !!(await SecureStore.getItemAsync('rawSalt')),
          hasDeviceUID:           !!deviceUID,
        });

        if (credentialId && publicKeyX && publicKeyY) {
          dispatch({
            type: "SET_KOKIO_PASSKEY",
            payload: { credentialId, x: publicKeyX as Hex, y: publicKeyY as Hex },
          });
        }

        const rawSalt = await SecureStore.getItemAsync('rawSalt');
        if (rawSalt) {
          dispatch({ type: "SET_RAW_SALT", payload: rawSalt });
        }

        const userWallet = await getValueForUserWallet(`userWallet-${deviceUID}`);
        if (userWallet) {
          dispatch({ type: "SET_USER_WALLET", payload: userWallet });
        }
      }
    };
    fetchUserData();
  }, []);

  /**
   * Reset in-memory Kokio state when the account is deleted — either explicitly via Settings,
   * or when ANY authed endpoint returns 404 ACCOUNT_DELETED (the interceptor path, where no screen is involved).
   *
   * State-only by design: storage is owned by purgeAccountLocalState, which runs in the same sequence.
   * Calling clearKokioUser() here would race it.
   */
  useEffect(
    () =>
      subscribeAccountDeleted((deleted) => {
        if (!deleted) return;
        dispatch({ type: 'CLEAR_KOKIO_USER' });
        dispatch({ type: 'CLEAR_KOKIO' });
      }),
    [],
  );

  /**
   * ── SDK initialisation + wallet auto-derivation ───────────────────────────
   *
   * Two-step effect:
   *   Step 1   —   Initialise the SDK when deviceUID + userPasskey are available but sdk is not constructed.
   *                setupKokio dispatches SET_KOKIO and returns; 
   *                the effect re-fires with kokio.sdk populated.
   *
   *   Step 2   —   When sdk is ready and userWallet is absent, 
   *                call checkWalletDeployed (Registry.isDeviceWalletValid) to distinguish:
   *                - New registration  : wallet not yet deployed on-chain ->
   *                  Registry returns false -> skip auto-derivation ->
   *                  WalletSetupModal drives deployment via sendUserOperation.
   *                - Recovery after reinstall  : wallet deployed on-chain ->
   *                  Registry returns true -> auto-derive SmartContractAccount
   *                  via getSmartWallet and persist via setupKokioUserWallet.
   */

  useEffect(() => {
    const initSdkAndDeriveWallet = async () => {
      if (!kokio.sdk && kokio.deviceUID && kokio.userPasskey) {
        await setupKokio();
        return;
      }
      if (
        kokio.sdk &&
        kokio.deviceUID &&
        kokio.userPasskey?.x &&
        kokio.userPasskey?.y &&
        kokio.rawSalt &&
        kokio.deviceWalletAddress &&
        !kokio.userWallet
      ) {
        try {
          const KokioConstants = await kokio.sdk.constants;
          const deployed = await checkWalletDeployed(
            kokio.deviceWalletAddress,
            kokio.sdk.viemWalletClient,
            KokioConstants.factoryAddresses.REGISTRY as Address,
          );

          if (!deployed) {
            // New registration
            logger.debug('WALLET_AUTO_DERIVE_SKIPPED', { reason: 'not_deployed' });
            return;
          }
          // Recovery
          const ownerKey: [Hex, Hex] = [kokio.userPasskey.x, kokio.userPasskey.y];
          const salt = BigInt(kokio.rawSalt);

          const deviceWallet = await kokio.sdk.smartAccount.getSmartWallet(
            kokio.deviceUID,
            ownerKey,
            salt,
          );

          await setupKokioUserWallet(kokio.deviceUID, deviceWallet);
          logger.debug('WALLET_AUTO_DERIVED', { deviceUID: kokio.deviceUID });
        } catch (err) {
          // Non-fatal: wallet card stays in setup-prompt state.
          logger.error('WALLET_AUTO_DERIVE_FAILED', { err });
        }
      }
    };

    initSdkAndDeriveWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kokio.deviceUID, kokio.userPasskey, kokio.sdk, kokio.rawSalt, kokio.userWallet, kokio.deviceWalletAddress]);

  // ── WalletConnect initialisation ──────────────────────────────────────────

  const wcInitialized = useRef(false);

  useEffect(() => {
    if (!kokio.sdk || !kokio.userWallet || wcInitialized.current) return;
    wcInitialized.current = true;

    const walletAddress = (kokio.userWallet as any).address ?? "";

    getWcSignClient().then((client) => {
      client.on("session_proposal", (proposal) => {
        setPendingProposal(proposal);
        router.push("/wc-session" as any);
      });

      client.on("session_request", async (event) => {
        const { topic, params, id } = event;
        const { request } = params;
        try {
          void walletAddress;
          throw new Error(`Method not yet implemented: ${request.method}`);
        } catch (err) {
          await client.respond({
            topic,
            response: {
              id,
              jsonrpc: "2.0",
              error: { code: 4001, message: (err as Error).message },
            },
          });
        }
      });

      client.on("session_delete", ({ topic }) => {
        logger.debug('WC_SESSION_DELETED', { topic });
      });
    }).catch((err) => {
      wcInitialized.current = false;
      logger.error('WC_INIT_FAILED', { err });
    });
  }, [kokio.sdk, kokio.userWallet]);

  return (
    <KokioContext.Provider
      value={{
        kokio,
        clearError,
        setupKokio,
        setupKokioDeviceUID,
        setupKokioUserWallet,
        setupKokioRegistration,
        setupKokioRecovery,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};
