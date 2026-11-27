import React, { ReactNode, useCallback, useEffect, useReducer, useRef } from "react";
import { router } from "expo-router";
import type { Kokio } from "kokio-sdk";
import type { Address, Hex } from "viem";
import { createKokioClient, deriveKokioWallet, resolveChain } from "@/lib/chain/kokio-client";
import type { KokioSmartAccount } from "kokio-sdk/types";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccount } from "@/lib/api/bff/account";
import {
  getWcSignClient,
  setPendingProposal,
} from "@/features/walletconnect/walletconnect-client";
import { logger } from "@/lib/logger";
import { getWalletState, awaitWalletDeploymentConfirmation } from "@/lib/api/bff/wallet";
import { subscribeAccountDeleted } from '@/lib/auth/account-deleted';
import { isAccountDeletedError, BffError } from "@/lib/api/bff/errors";
import { appendWalletActivityEntry } from "@/features/wallet/wallet-activity";
import { WALLET_ACTIVITY_KEY } from "@/lib/query-keys";
import {
  CREDENTIAL_ID_KEY,
  DEVICE_UID_KEY,
  DEVICE_WALLET_ADDRESS_KEY,
  PUBLIC_KEY_X_KEY,
  PUBLIC_KEY_Y_KEY,
  RAW_SALT_KEY,
  purchasedEsimsKey,
  userDataKey,
  userWalletKey,
} from "@/lib/storage/keys";
import { queryClient } from "@/lib/api/query-client";
import { KokioContext, initialState, kokioReducer, type UserData } from "./kokio-state";
import { readJson, saveJson } from "./kokio-storage";

interface KokioProviderProps {
  children: ReactNode;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const KokioProvider: React.FC<KokioProviderProps> = ({ children }) => {
  const [kokio, dispatch] = useReducer(kokioReducer, initialState);

  // ── Actions ───────────────────────────────────────────────────────────────

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const setupKokioDeviceUID = async (deviceUID: string) => {
    await saveJson(DEVICE_UID_KEY, deviceUID);
    dispatch({ type: "SET_DEVICE_UID", payload: deviceUID });
  };

  const setupKokio = useCallback(async () => {
    const credentialId =
      kokio.userPasskey?.credentialId ??
      await SecureStore.getItemAsync(CREDENTIAL_ID_KEY) ??
      null;

    if (!credentialId) {
      dispatch({ type: "ERROR", payload: "Credential ID not found" });
      return;
    }

    const resolvedAddress =
      kokio.deviceWalletAddress ||
      await SecureStore.getItemAsync(DEVICE_WALLET_ADDRESS_KEY);

    if (!resolvedAddress) {
      dispatch({ type: "ERROR", payload: "Kokio wallet address not found" });
      return;
    }

    const chain = resolveChain();
    if (!chain) {
      dispatch({ type: "ERROR", payload: "Chain configuration missing or invalid" });
      return;
    }

    const kokioSDK = createKokioClient(chain, credentialId, resolvedAddress as Address);

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
    await saveJson(DEVICE_UID_KEY, deviceUniqueIdentifier);
    await SecureStore.setItemAsync(DEVICE_WALLET_ADDRESS_KEY, deviceWalletAddress);
    await SecureStore.setItemAsync(CREDENTIAL_ID_KEY, credentialId);
    await SecureStore.setItemAsync(PUBLIC_KEY_X_KEY, publicKeyX);
    await SecureStore.setItemAsync(PUBLIC_KEY_Y_KEY, publicKeyY);
    await SecureStore.setItemAsync(RAW_SALT_KEY, rawSalt);

    const userData: UserData = {
      id: deviceUniqueIdentifier,
      wallets: [{ address: deviceWalletAddress }],
    };
    await saveJson<UserData>(userDataKey(deviceUniqueIdentifier), userData);

    dispatch({ type: "SET_DEVICE_UID",            payload: deviceUniqueIdentifier });
    dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: deviceWalletAddress });
    dispatch({ type: "SET_RAW_SALT",              payload: rawSalt });
    dispatch({ type: "SET_KOKIO_USER",            payload: userData });
    dispatch({ type: "SET_KOKIO_PASSKEY",         payload: { credentialId, x: publicKeyX, y: publicKeyY } });
  };

  const setupKokioUserWallet = useCallback(async (deviceUID: string, wallet: KokioSmartAccount) => {
    await saveJson<KokioSmartAccount>(userWalletKey(deviceUID), wallet);
    dispatch({ type: "SET_USER_WALLET", payload: wallet });
  }, []);

  const setupKokioRecovery = async (deviceWalletAddress: string, credentialId: string) => {
    await SecureStore.setItemAsync(DEVICE_WALLET_ADDRESS_KEY, deviceWalletAddress);
    await SecureStore.setItemAsync(CREDENTIAL_ID_KEY, credentialId);
    dispatch({ type: 'SET_DEVICE_WALLET_ADDRESS', payload: deviceWalletAddress });

    try {
      const account = await getAccount();
      await saveJson(DEVICE_UID_KEY, account.deviceUniqueIdentifier);
      await SecureStore.setItemAsync(PUBLIC_KEY_X_KEY, account.pubKeyX);
      await SecureStore.setItemAsync(PUBLIC_KEY_Y_KEY, account.pubKeyY);
      await SecureStore.setItemAsync(RAW_SALT_KEY,    account.salt);
  
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
        const deviceUID = kokio.deviceUID;
        const deviceWalletAddress = kokio.deviceWalletAddress as Address;

        const { account, kokio: upgraded } = await deriveKokioWallet(
          kokio.sdk!,
          deviceUID,
          kokio.userPasskey!,
          kokio.rawSalt,
          deviceWalletAddress,
        );
        const registryProbe = upgraded.registry;

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
    await SecureStore.deleteItemAsync(userWalletKey(kokio.deviceUID)).catch(() => {});
    await SecureStore.deleteItemAsync(userDataKey(kokio.deviceUID)).catch(() => {});
    await AsyncStorage.removeItem(purchasedEsimsKey(kokio.deviceUID)).catch(() => {});
    await SecureStore.deleteItemAsync(DEVICE_UID_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(DEVICE_WALLET_ADDRESS_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(CREDENTIAL_ID_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(PUBLIC_KEY_X_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(PUBLIC_KEY_Y_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(RAW_SALT_KEY).catch(() => {});
    clearKokio();
  };

  // ── Boot hydration ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchUserData = async () => {
      const storedWalletAddress = await SecureStore.getItemAsync(DEVICE_WALLET_ADDRESS_KEY);
      if (storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_WALLET_ADDRESS", payload: storedWalletAddress });
      }

      const deviceUID = await readJson<string>(DEVICE_UID_KEY);

      if (deviceUID && !storedWalletAddress) {
        await SecureStore.deleteItemAsync(DEVICE_UID_KEY);
        await SecureStore.deleteItemAsync(CREDENTIAL_ID_KEY);
        logger.debug('KOKIO_PURGED_ORPHAN_DEVICEUID');
      }

      if (deviceUID && storedWalletAddress) {
        dispatch({ type: "SET_DEVICE_UID", payload: deviceUID });

        const userData = await readJson<UserData>(userDataKey(deviceUID));
        if (userData) {
          dispatch({
            type: "SET_KOKIO_USER",
            payload: {
              id: userData.id,
              wallets: userData.wallets,
            },
          });
        }

        const credentialId = await SecureStore.getItemAsync(CREDENTIAL_ID_KEY);
        const publicKeyX   = await SecureStore.getItemAsync(PUBLIC_KEY_X_KEY);
        const publicKeyY   = await SecureStore.getItemAsync(PUBLIC_KEY_Y_KEY);
        logger.debug('KOKIO_SECURESTORE_HYDRATION', {
          hasDeviceWalletAddress: !!storedWalletAddress,
          hasCredentialId:        !!credentialId,
          hasPublicKeyX:          !!publicKeyX,
          hasPublicKeyY:          !!publicKeyY,
          hasRawSalt:             !!(await SecureStore.getItemAsync(RAW_SALT_KEY)),
          hasDeviceUID:           !!deviceUID,
        });

        if (credentialId && publicKeyX && publicKeyY) {
          dispatch({
            type: "SET_KOKIO_PASSKEY",
            payload: { credentialId, x: publicKeyX as Hex, y: publicKeyY as Hex },
          });
        }

        const rawSalt = await SecureStore.getItemAsync(RAW_SALT_KEY);
        if (rawSalt) {
          dispatch({ type: "SET_RAW_SALT", payload: rawSalt });
        }

        const userWallet = await readJson<KokioSmartAccount>(userWalletKey(deviceUID));
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
          if (err instanceof BffError && err.code === 'RATE_LIMIT_EXCEEDED') {
            logger.debug('WALLET_AUTO_DERIVE_RATE_LIMITED', { err });
          } else {
            logger.error('WALLET_AUTO_DERIVE_FAILED', { err });
          }
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
   * setupKokio's `createKokioClient(...)` above binds no smart account, so the constructor
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
      const { kokio: upgraded } = await deriveKokioWallet(
        kokio.sdk,
        kokio.deviceUID,
        kokio.userPasskey,
        kokio.rawSalt,
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

    const walletAddress = kokio.userWallet.address ?? "";

    getWcSignClient().then((client) => {
      client.on("session_proposal", (proposal) => {
        setPendingProposal(proposal);
        router.push("/wc-session");
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
