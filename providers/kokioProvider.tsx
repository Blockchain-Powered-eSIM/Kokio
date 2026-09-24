import React, { ReactNode, createContext, useCallback, useEffect, useReducer, useRef } from "react";
import { router } from "expo-router";
import { Kokio } from "kokio-sdk";
import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
import { createWalletClient, http, type Address, type Hex } from "viem";
import { baseSepolia, base } from "viem/chains";
import Constants from "expo-constants";
import { AppExtraConfig, Config } from "@/appKeys";
import type { KokioSmartAccount } from "kokio-sdk/types";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccount } from "@/utils/bff/account";
import {
  getWcSignClient,
  setPendingProposal,
} from "@/utils/walletconnect/signClient";
import { logger } from "@/utils/logger";
import { getWalletState, awaitWalletDeploymentConfirmation } from "@/utils/bff/wallet";
import { subscribeAccountDeleted } from '@/utils/auth/accountDeleted';
import { isAccountDeletedError } from "@/utils/bff/errors";
import { appendWalletActivityEntry, WALLET_ACTIVITY_KEY } from "@/utils/walletActivity";
import { queryClient } from "@/services/queryClient";

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

const initialState: KokioState = {
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

interface KokioProviderProps {
  children: ReactNode;
}

// ── SecureStore helpers ───────────────────────────────────────────────────

const saveValueForDeviceUID = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
};

const saveValueForUserData = async (key: string, value: UserData) => {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
};

const saveValueForUserWallet = async (key: string, value: KokioSmartAccount) => {
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

const getValueForUserWallet = async (key: string): Promise<KokioSmartAccount | undefined> => {
  const result = await SecureStore.getItemAsync(key);
  if (result) return JSON.parse(result) as KokioSmartAccount;
};

const deleteValueForUser = async (key: string) => {
  await SecureStore.deleteItemAsync(key);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);

  // ── Actions ───────────────────────────────────────────────────────────────

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveValueForDeviceUID("deviceUID", deviceUID);
    dispatch({ type: "SET_DEVICE_UID", payload: deviceUID });
  };

  const setupKokio = useCallback(async () => {
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
      extra.pimlicoApiKey ?? '',
      extra.gasManagerPolicyId ?? '',
    );

    dispatch({ type: "SET_KOKIO", payload: kokioSDK });
  }, [kokio.userPasskey, kokio.deviceWalletAddress]);

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

  const setupKokioUserWallet = useCallback(async (deviceUID: string, wallet: KokioSmartAccount) => {
    await saveValueForUserWallet(`userWallet-${deviceUID}`, wallet);
    dispatch({ type: "SET_USER_WALLET", payload: wallet });
  }, []);

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
      // The initSdkAndDeriveWallet useEffect reads GET /account/wallet's walletState once the SDK is ready.
    } catch (err) {
      if ( isAccountDeletedError(err) ) {
        // Terminal
        logger.debug('RECOVERY_ABORTED_ACCOUNT_DELETED');
        throw err;
      }
    }
  };

  /**
   * ── Background wallet-deployment watcher ──────────────────────────────────
   *
   * Deployment is cron-driven server-side and can take up to 6-7 minutes in the worst case, so nothing should block a screen waiting on it. 
   * This confirms completion in the background — races the BFF's walletState against a direct on-chain registry read (whichever answers first wins)
   * — and populates userWallet once confirmed, whether or not the user is still looking at a wallet screen.
   * Called right after a deploy request is submitted, and again from the auto-derive effect below on app boot if one was already in flight.
   */
  const walletDeploymentWatchInFlight = useRef(false);

  const beginWalletDeploymentWatch = useCallback(() => {
    if (
      walletDeploymentWatchInFlight.current ||
      !kokio.sdk ||
      !kokio.deviceUID ||
      !kokio.userPasskey?.x ||
      !kokio.userPasskey?.y ||
      !kokio.rawSalt ||
      !kokio.deviceWalletAddress
    ) {
      return;
    }

    walletDeploymentWatchInFlight.current = true;
    dispatch({ type: "SET_WALLET_DEPLOYING", payload: true });
    dispatch({ type: "SET_WALLET_DEPLOYMENT_ERROR", payload: null });

    (async () => {
      try {
        const ownerKey: [Hex, Hex] = [kokio.userPasskey!.x, kokio.userPasskey!.y];
        const salt = BigInt(kokio.rawSalt);
        const deviceUID = kokio.deviceUID;
        const deviceWalletAddress = kokio.deviceWalletAddress as Address;
        const sdk = kokio.sdk!;

        const account = await sdk.smartAccount.getSmartWallet(deviceUID, ownerKey, salt);
        const smartAccountClient = await sdk.smartAccount.getSmartWalletClient(account);
        const registryProbe = new Kokio(
          sdk.viemWalletClient,
          sdk.credentialId,
          sdk.rpId,
          sdk.pimlicoAPIKey,
          sdk.gasPolicyId,
          smartAccountClient,
          deviceWalletAddress,
        ).registry;

        const deployed = await awaitWalletDeploymentConfirmation(registryProbe, deviceWalletAddress);

        if (deployed) {
          await setupKokioUserWallet(deviceUID, account);
          logger.debug('WALLET_DEPLOYMENT_WATCH_CONFIRMED', { deviceUID });
          appendWalletActivityEntry(deviceUID, { type: 'WALLET_DEPLOYED', timestamp: Date.now() })
            .then(() => queryClient.invalidateQueries({ queryKey: [WALLET_ACTIVITY_KEY, deviceUID] }))
            .catch((err) => logger.error('WALLET_ACTIVITY_LOG_FAILED', { err }));
        } else {
          logger.error('WALLET_DEPLOYMENT_WATCH_GAVE_UP', { deviceUID });
          const lastError = await getWalletState()
            .then((state) => state.deployment?.lastError ?? null)
            .catch(() => null);
          dispatch({
            type: "SET_WALLET_DEPLOYMENT_ERROR",
            payload: lastError ?? 'Wallet setup could not be completed. Please try again.',
          });
        }
      } catch (err) {
        logger.error('WALLET_DEPLOYMENT_WATCH_ERROR', { err });
      } finally {
        dispatch({ type: "SET_WALLET_DEPLOYING", payload: false });
        walletDeploymentWatchInFlight.current = false;
      }
    })();
  }, [
    kokio.sdk,
    kokio.deviceUID,
    kokio.userPasskey,
    kokio.rawSalt,
    kokio.deviceWalletAddress,
    setupKokioUserWallet,
  ]);

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
   *                read GET /account/wallet's walletState to distinguish:
   *                - New registration, or a deployment still in progress :
   *                  walletState is NOT_DEPLOYED or DEPLOYING -> skip
   *                  auto-derivation -> WalletSetupModal/create-wallet.tsx
   *                  drive deployment via useWalletDeployment.
   *                - Recovery after reinstall  : walletState is DEPLOYED ->
   *                  auto-derive SmartContractAccount via getSmartWallet and
   *                  persist via setupKokioUserWallet.
   *
   *                GET /account/wallet needs only DPoP auth, no step-up, so
   *                this never prompts for biometrics on its own — unlike
   *                GET /account, which does require step-up and must not be
   *                used here.
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
          const { walletState } = await getWalletState();

          if (walletState === 'DEPLOYING') {
            logger.debug('WALLET_AUTO_DERIVE_RESUMING_WATCH', { walletState });
            beginWalletDeploymentWatch();
            return;
          }
          if (walletState !== 'DEPLOYED') {
            // New registration — nothing deployed or in progress yet.
            logger.debug('WALLET_AUTO_DERIVE_SKIPPED', { reason: 'not_deployed', walletState });
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
  }, [
    kokio.deviceUID,
    kokio.userPasskey,
    kokio.sdk,
    kokio.rawSalt,
    kokio.userWallet,
    kokio.deviceWalletAddress,
    setupKokio,
    setupKokioUserWallet,
    beginWalletDeploymentWatch,
  ]);

  /**
   * ── Smart account upgrade for returning users ─────────────────────────────
   *
   * setupKokio's `new Kokio(...)` above only passes 5 args, so the constructor
   * never receives `smartAccountClient` / `deviceWalletAddress` and leaves
   * `registry` / `deviceWallet` / `eSIMWallet` / `paymentAdapter` all
   * `undefined` (see kokio-sdk's Kokio constructor). A returning user whose
   * wallet is already deployed (`kokio.userWallet` truthy) needs those
   * sub-packages usable, so once the device-wallet material is available this
   * derives a smart account client and rebuilds `Kokio` with the two extra
   * args bound, replacing the in-memory instance via SET_KOKIO.
   *
   * `getSmartWallet`/`getSmartWalletClient` only derive the account/client —
   * no passkey or biometric prompt fires here (that only happens on
   * sendUserOperation, which this deliberately never calls).
   *
   * Exposed as `ensureSmartAccountUpgraded` (not just a boot-time effect)
   * because the attempt is best-effort and non-fatal: if it fails once (a
   * transient RPC hiccup deriving the client) or simply hasn't finished yet
   * by the time a screen needs `kokio.sdk.deviceWallet`, there was previously
   * no way to retry within the session short of restarting the app — every
   * `deviceWallet`-dependent write (e.g. the eSIM top-up toggle) would keep
   * failing with "Wallet not ready..." until then. Idempotent: a no-op
   * whenever `deviceWallet` is already set or an attempt is already in
   * flight, so call sites can call it defensively without guarding first.
   *
   * Returns the current/updated `Kokio` instance (or `null` if unavailable)
   * rather than relying on callers to re-read `kokio.sdk` from context after
   * awaiting — a caller's own `kokio` closure captured before this resolves
   * would otherwise still be looking at the pre-upgrade instance until their
   * component's next render.
   */

  const smartAccountUpgradeInFlight = useRef(false);

  const ensureSmartAccountUpgraded = useCallback(async (): Promise<Kokio | null> => {
    if (!kokio.sdk) {
      smartAccountUpgradeInFlight.current = false;
      return null;
    }

    if (kokio.sdk.deviceWallet) {
      return kokio.sdk;
    }

    if (
      smartAccountUpgradeInFlight.current ||
      !kokio.userWallet ||
      !kokio.deviceUID ||
      !kokio.userPasskey?.x ||
      !kokio.userPasskey?.y ||
      !kokio.rawSalt ||
      !kokio.deviceWalletAddress
    ) {
      return null;
    }

    smartAccountUpgradeInFlight.current = true;
    try {
      const ownerKey: [Hex, Hex] = [kokio.userPasskey.x, kokio.userPasskey.y];
      const salt = BigInt(kokio.rawSalt);

      const account = await kokio.sdk.smartAccount.getSmartWallet(
        kokio.deviceUID,
        ownerKey,
        salt,
      );
      const smartAccountClient = await kokio.sdk.smartAccount.getSmartWalletClient(account);

      const upgraded = new Kokio(
        kokio.sdk.viemWalletClient,
        kokio.sdk.credentialId,
        kokio.sdk.rpId,
        kokio.sdk.pimlicoAPIKey,
        kokio.sdk.gasPolicyId,
        smartAccountClient,
        kokio.deviceWalletAddress as Address,
      );

      dispatch({ type: "SET_KOKIO", payload: upgraded });
      logger.debug('SMART_ACCOUNT_UPGRADED', { deviceUID: kokio.deviceUID });
      return upgraded;
    } catch (err) {
      logger.error('SMART_ACCOUNT_UPGRADE_FAILED', { err });
      return null;
    } finally {
      smartAccountUpgradeInFlight.current = false;
    }
  }, [
    kokio.sdk,
    kokio.userWallet,
    kokio.deviceUID,
    kokio.userPasskey,
    kokio.rawSalt,
    kokio.deviceWalletAddress,
  ]);

  useEffect(() => {
    ensureSmartAccountUpgraded();
  }, [ensureSmartAccountUpgraded]);

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
        beginWalletDeploymentWatch,
        ensureSmartAccountUpgraded,
        clearKokio,
        clearKokioUser,
      }}
    >
      {children}
    </KokioContext.Provider>
  );
};
